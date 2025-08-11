// src/utils/buildMonthlyPresenceCsv.ts
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/** Ritorna i giorni 1..N del mese (month0: 0=Gennaio ... 11=Dicembre) */
function daysInMonth(year: number, month0: number) {
  const N = new Date(year, month0 + 1, 0).getDate();
  return Array.from({ length: N }, (_, i) => i + 1);
}

/** ISO "YYYY-MM-DD" in UTC */
function toISODate(year: number, month0: number, day: number) {
  const d = new Date(Date.UTC(year, month0, day, 0, 0, 0));
  return d.toISOString().slice(0, 10);
}

/** Legge o crea la config: settings/billing.mealPriceEuro */
export async function getMealPriceEuro(): Promise<number> {
  const ref = doc(db, "settings", "billing");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const v = (snap.data() as any)?.mealPriceEuro;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  // default
  return 2.0;
}

/** Salva il prezzo pasto */
export async function setMealPriceEuro(value: number) {
  const ref = doc(db, "settings", "billing");
  // merge: crea il doc se non esiste
  await import("firebase/firestore").then(({ setDoc }) =>
    setDoc(ref, { mealPriceEuro: value }, { merge: true })
  );
}

/** Genera l'intero CSV come stringa */
export async function buildMonthlyPresenceCsv(year: number, month0: number, mealPriceEuro?: number) {
  const price = typeof mealPriceEuro === "number" ? mealPriceEuro : await getMealPriceEuro();

  // 1) utenti attivi (tutti i ruoli)
  const usersSnap = await getDocs(query(collection(db, "users"), where("active", "==", true)));
  const users = usersSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .sort(
      (a, b) =>
        (a.cognome || "").localeCompare(b.cognome || "", "it") ||
        (a.nome || "").localeCompare(b.nome || "", "it")
    );

  // 2) selezioni del mese: proviamo prima per intervallo stringa ISO "date",
  // ma gestiamo anche Timestamp (date|data con toDate())
  const firstIso = toISODate(year, month0, 1);
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const lastIso = toISODate(year, month0, lastDay);

  const selCol = collection(db, "menuSelections");
  // Se non hai indice composito per due where su "date", Firestore chiederà di crearlo (una volta sola)
  const selSnap = await getDocs(
    query(selCol, where("date", ">=", firstIso), where("date", "<=", lastIso))
  );

  // Fallback: se nessun documento ha "date" ISO, proviamo a prendere TUTTE le selezioni del mese
  // e filtrare a mano da campi alternativi (date/data timestamp)
  const selections = selSnap.empty
    ? (await getDocs(selCol)).docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
    : selSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const days = daysInMonth(year, month0);

  // 3) header
  const header = ["Progressivo", "Utente", ...days.map(String), "Totale presenze", "Totale euro"];

  // 4) righe
  const rows: string[] = [];
  rows.push(header.join(",")); // CSV

  let progressivo = 1;

  for (const u of users) {
    const fullName = `${u.nome || ""} ${u.cognome || ""}`.trim();
    let presenze = 0;
    const marks: string[] = [];

    for (const d of days) {
      const iso = toISODate(year, month0, d);

      // match per utente+giorno: True se almeno un piatto selezionato
      const has = selections.some((s) => {
        if (s.userId !== u.id) return false;

        // prova "date" ISO
        if (typeof s.date === "string" && s.date.slice(0, 10) === iso) {
          return Array.isArray(s.selectedItems) && s.selectedItems.length > 0;
        }

        // prova Timestamp in s.date o s.data
        const tsLike = s.date?.toDate ? s.date : s.data?.toDate ? s.data : null;
        if (tsLike) {
          const dt: Date = tsLike.toDate();
          const asIso = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))
            .toISOString()
            .slice(0, 10);
          if (asIso === iso) {
            return Array.isArray(s.selectedItems) && s.selectedItems.length > 0;
          }
        }

        return false;
      });

      if (has) {
        presenze += 1;
        marks.push("x");
      } else {
        marks.push("");
      }
    }

    const euro = (presenze * price).toFixed(2).replace(".", ","); // virgola decimale
    const line = [
      String(progressivo++),
      csvEscape(fullName),
      ...marks,
      String(presenze),
      csvEscape(euro),
    ].join(",");

    rows.push(line);
  }

  return rows.join("\n");
}

/** Escapa virgole/virgolette per CSV */
function csvEscape(v: string) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
