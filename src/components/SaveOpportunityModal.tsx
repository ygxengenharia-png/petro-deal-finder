import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/petronect-parser";
import { saveOpportunity } from "@/lib/history-store";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaults: {
    title: string;
    itemNumber: string;
    supplier: string;
    opportunityNumber?: string;
    suggestedSale?: number;
  };
};

export function SaveOpportunityModal({ open, onClose, onSaved, defaults }: Props) {
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [saleValueYGX, setSaleValueYGX] = useState<string>("");
  const [costValue, setCostValue] = useState<string>("");

  useEffect(() => {
    if (open) {
      setOpportunityNumber(defaults.opportunityNumber ?? "");
      setSaleValueYGX(defaults.suggestedSale != null ? String(defaults.suggestedSale) : "");
      setCostValue("");
    }
  }, [open, defaults]);

  if (!open) return null;

  const sale = Number(saleValueYGX.replace(",", ".")) || 0;
  const cost = Number(costValue.replace(",", ".")) || 0;
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;

  const handleSave = async () => {
    if (!opportunityNumber.trim()) return;
    await saveOpportunity({
      title: defaults.title,
      itemNumber: defaults.itemNumber,
      opportunityNumber: opportunityNumber.trim(),
      supplier: defaults.supplier,
      saleValueYGX: sale,
      costValue: cost,
    });
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold">Salvar Oportunidade</h2>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{defaults.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Item {defaults.itemNumber} · {defaults.supplier}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field
            label="Número da Oportunidade"
            value={opportunityNumber}
            onChange={setOpportunityNumber}
            placeholder="Ex.: 7004584613"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Valor de Venda YGX"
              value={saleValueYGX}
              onChange={setSaleValueYGX}
              placeholder="0,00"
              type="number"
            />
            <Field
              label="Valor de Compra (Custo)"
              value={costValue}
              onChange={setCostValue}
              placeholder="0,00"
              type="number"
            />
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lucro Estimado</span>
              <span
                className={`font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}
              >
                {formatBRL(profit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Margem</span>
              <span
                className={`font-semibold ${margin >= 0 ? "text-success" : "text-destructive"}`}
              >
                {margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!opportunityNumber.trim()}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar na YGX
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-info"
      />
    </label>
  );
}
