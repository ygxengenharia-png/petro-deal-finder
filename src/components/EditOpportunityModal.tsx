import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/petronect-parser";
import { updateOpportunity, type Opportunity } from "@/lib/history-store";

type Props = {
  open: boolean;
  opportunity: Opportunity | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditOpportunityModal({ open, opportunity, onClose, onSaved }: Props) {
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [title, setTitle] = useState("");
  const [supplier, setSupplier] = useState("");
  const [saleValueYGX, setSaleValueYGX] = useState("");
  const [costValue, setCostValue] = useState("");
  const [factory, setFactory] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && opportunity) {
      setOpportunityNumber(opportunity.opportunityNumber);
      setTitle(opportunity.title);
      setSupplier(opportunity.supplier);
      setSaleValueYGX(String(opportunity.saleValueYGX ?? ""));
      setCostValue(String(opportunity.costValue ?? ""));
      setFactory(opportunity.factory ?? "");
      setPartNumber(opportunity.partNumber ?? "");
      setDescription(opportunity.description ?? "");
      setNotes(opportunity.notes ?? "");
    }
  }, [open, opportunity]);

  if (!open || !opportunity) return null;

  const sale = Number(saleValueYGX.replace(",", ".")) || 0;
  const cost = Number(costValue.replace(",", ".")) || 0;
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;

  const handleSave = () => {
    if (!opportunityNumber.trim()) return;
    updateOpportunity(opportunity.id, {
      opportunityNumber: opportunityNumber.trim(),
      title: title.trim() || opportunity.title,
      supplier: supplier.trim(),
      saleValueYGX: sale,
      costValue: cost,
      factory: factory.trim(),
      partNumber: partNumber.trim(),
      description: description.trim(),
      notes: notes.trim(),
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
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">Editar Oportunidade</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Item {opportunity.itemNumber} · criada em{" "}
            {new Date(opportunity.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Número da Oportunidade" value={opportunityNumber} onChange={setOpportunityNumber} />
            <Field label="Fornecedor" value={supplier} onChange={setSupplier} />
          </div>

          <Field label="Título" value={title} onChange={setTitle} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fábrica" value={factory} onChange={setFactory} placeholder="Ex.: FARRIS, Crosby…" />
            <Field label="Part Number" value={partNumber} onChange={setPartNumber} placeholder="Ex.: 26HA-8M30" />
          </div>

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

          <TextareaField
            label="Descrição"
            value={description}
            onChange={setDescription}
            placeholder="Detalhes técnicos, especificações…"
            rows={3}
          />

          <TextareaField
            label="Observações / Pensamento"
            value={notes}
            onChange={setNotes}
            placeholder="Anotações sobre estratégia, contatos, prazos…"
            rows={3}
          />

          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lucro</span>
              <span className={`font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                {formatBRL(profit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Margem</span>
              <span className={`font-semibold ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                {margin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
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
            Salvar Alterações
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

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-info resize-y"
      />
    </label>
  );
}
