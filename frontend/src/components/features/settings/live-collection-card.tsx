/* eslint-disable i18next/no-literal-string, jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- CloudGuard settings (mock-adjacent live card) */
import React from "react";
import {
  useCollection,
  useAddCollectionItem,
  useRemoveCollectionItem,
} from "#/hooks/query/use-cloudguard";
import { Capable } from "#/components/features/acp/capable";

// Reusable live per-tenant collection card (webhooks / service accounts / connectors).
// Reads for all roles; add/delete gated to admin. Renders nothing if the endpoint is
// unreachable (additive over the existing mock UI).
export function LiveCollectionCard({
  seg,
  title,
  field,
  placeholder,
}: {
  seg: string;
  title: string;
  field: string;
  placeholder: string;
}) {
  const listQ = useCollection(seg);
  const addMut = useAddCollectionItem(seg);
  const delMut = useRemoveCollectionItem(seg);
  const [value, setValue] = React.useState("");
  if (listQ.isLoading || listQ.isError) return null;
  const items = listQ.data ?? [];
  return (
    <div
      style={{
        background: "var(--cg-bg-card)",
        border: "1px solid var(--cg-border)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--cg-text-primary)",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "#4caf7d",
            background: "rgba(76,175,125,0.15)",
            borderRadius: 99,
            padding: "2px 7px",
          }}
        >
          live
        </span>
      </div>
      {items.length === 0 && (
        <div
          style={{
            fontSize: 12.5,
            color: "var(--cg-text-muted)",
            marginBottom: 10,
          }}
        >
          None configured yet.
        </div>
      )}
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--cg-border-subtle)",
          }}
        >
          <span style={{ fontSize: 12.5, color: "var(--cg-text-primary)" }}>
            {String(it[field] ?? it.id)}
          </span>
          <Capable cap="admin">
            <span
              onClick={() => delMut.mutate(it.id)}
              style={{
                color: "var(--cg-danger)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Delete
            </span>
          </Capable>
        </div>
      ))}
      <Capable cap="admin">
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              height: 32,
              padding: "0 10px",
              background: "var(--cg-input-bg)",
              border: "1px solid var(--cg-border)",
              borderRadius: 6,
              color: "var(--cg-text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => {
              addMut.mutate({ [field]: value.trim() });
              setValue("");
            }}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 6,
              background: "var(--cg-text-primary)",
              color: "var(--cg-bg-card)",
              border: "none",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: value.trim() ? "pointer" : "not-allowed",
              opacity: value.trim() ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>
      </Capable>
    </div>
  );
}
