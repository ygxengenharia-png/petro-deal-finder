import Papa from "papaparse";

export type Bid = {
  itemNumber: string;
  description: string;
  supplier: string;
  value: number;
  opportunityNumber?: string;
};

export type RankedItem = {
  itemNumber: string;
  description: string;
  opportunityNumber?: string;
  bids: Bid[]; // sorted ascending by value
};

/**
 * Converts a Petronect numeric string to a Number.
 * Handles both BR format ("1.500,00") and US/raw format ("380000.00", "3000").
 */
export function parseBRNumber(raw: unknown): number {
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  // strip currency / whitespace
  s = s.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return NaN;

  const hasComma = s.includes(",");
  if (hasComma) {
    // BR format: dots are thousand separators, comma is decimal
    s = s.replace(/\./g, "").replace(",", ".");
  }
  // else: already a plain numeric string
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const HEADER_ALIASES: Record<keyof RawRow, string[]> = {
  itemNumber: ["número do item", "numero do item", "n° do item", "no do item"],
  description: ["descrição do item", "descricao do item", "descrição", "descricao"],
  supplier: ["razão social", "razao social", "fornecedor"],
  valueTotal: ["valor total"],
  valueItem: ["valor item", "valor do item", "valor unitário", "valor unitario"],
  opportunity: [
    "número da oportunidade",
    "numero da oportunidade",
    "oportunidade",
    "nº oportunidade",
  ],
};

type RawRow = {
  itemNumber: string;
  description: string;
  supplier: string;
  valueTotal: string;
  valueItem: string;
  opportunity: string;
};

function normalizeHeader(h: string): string {
  return h
    .replace(/\uFEFF/g, "")
    .trim()
    .toLowerCase();
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof RawRow, string>> {
  const map: Partial<Record<keyof RawRow, string>> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  (Object.keys(HEADER_ALIASES) as (keyof RawRow)[]).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    const found = normalized.find((h) => aliases.some((a) => h.norm === a || h.norm.includes(a)));
    if (found) map[key] = found.raw;
  });
  return map;
}

export type ParseResult = {
  items: RankedItem[];
  detectedOpportunity?: string;
  rowCount: number;
  warnings: string[];
};

export function parsePetronectCSV(text: string): ParseResult {
  const warnings: string[] = [];

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/\uFEFF/g, "").trim(),
  });

  if (parsed.errors.length) {
    parsed.errors.slice(0, 3).forEach((e) => warnings.push(`CSV: ${e.message}`));
  }

  const rows = parsed.data || [];
  const headers = parsed.meta.fields || [];
  const headerMap = buildHeaderMap(headers);

  if (!headerMap.itemNumber || !headerMap.supplier) {
    warnings.push(
      "Cabeçalhos esperados não encontrados. Verifique se o CSV é exportação Petronect (delimitador ;).",
    );
  }

  const itemsMap = new Map<string, RankedItem>();
  let detectedOpportunity: string | undefined;

  for (const row of rows) {
    const itemNumber = headerMap.itemNumber ? String(row[headerMap.itemNumber] ?? "").trim() : "";
    if (!itemNumber) continue;

    const description = headerMap.description
      ? String(row[headerMap.description] ?? "").trim()
      : "";
    const supplier = headerMap.supplier ? String(row[headerMap.supplier] ?? "").trim() : "";
    const rawTotal = headerMap.valueTotal ? row[headerMap.valueTotal] : undefined;
    const rawItem = headerMap.valueItem ? row[headerMap.valueItem] : undefined;
    const value = parseBRNumber(rawTotal ?? rawItem);

    const opp = headerMap.opportunity ? String(row[headerMap.opportunity] ?? "").trim() : "";
    if (opp && !detectedOpportunity) detectedOpportunity = opp;

    if (!supplier || !Number.isFinite(value) || value <= 0) continue;

    let item = itemsMap.get(itemNumber);
    if (!item) {
      item = {
        itemNumber,
        description,
        opportunityNumber: opp || undefined,
        bids: [],
      };
      itemsMap.set(itemNumber, item);
    }
    if (!item.description && description) item.description = description;
    if (!item.opportunityNumber && opp) item.opportunityNumber = opp;

    item.bids.push({
      itemNumber,
      description,
      supplier,
      value,
      opportunityNumber: opp || undefined,
    });
  }

  const items = Array.from(itemsMap.values()).map((it) => ({
    ...it,
    bids: [...it.bids].sort((a, b) => a.value - b.value),
  }));
  items.sort((a, b) => a.itemNumber.localeCompare(b.itemNumber));

  return {
    items,
    detectedOpportunity,
    rowCount: rows.length,
    warnings,
  };
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Read a File as text using ISO-8859-1 (Petronect default). */
export function readFileAsLatin1(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(file, "ISO-8859-1");
  });
}
