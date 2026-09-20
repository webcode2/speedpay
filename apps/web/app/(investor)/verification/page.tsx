"use client";

import { FormEvent, useEffect, useState } from "react";
import { InvestorPage } from "../_components/investor-page";

type VerificationData = {
  status: string;
  documents: { id: string; documentType: string; fileName: string }[];
  request: { rejectionReason: string | null } | null;
};

export default function VerificationPage() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [docType, setDocType] = useState("ID_FRONT");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/verification");
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Failed to load");
      setLoading(false);
      return;
    }
    setData(json.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a file");
      return;
    }
    const body = new FormData();
    body.set("documentType", docType);
    body.set("file", file);
    const res = await fetch("/api/verification/documents", {
      method: "POST",
      body,
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Upload failed");
      return;
    }
    setMessage(`Uploaded ${docType}`);
    await load();
    form.reset();
  }

  async function onSubmit() {
    setError(null);
    setMessage(null);
    const res = await fetch("/api/verification", { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      setError(json.error?.message ?? "Submit failed");
      return;
    }
    setMessage("Verification submitted.");
    await load();
  }

  return (
    <InvestorPage title="Verification">
      {loading ? <p className="text-slate-400">Loading…</p> : null}
      <p className="text-slate-400">Status: {data?.status ?? "NOT_STARTED"}</p>
      {data?.request?.rejectionReason ? (
        <p className="text-amber-300">Reason: {data.request.rejectionReason}</p>
      ) : null}
      <ul className="text-sm text-slate-300">
        {(data?.documents ?? []).map((d) => (
          <li key={d.id}>
            {d.documentType}: {d.fileName}
          </li>
        ))}
        {(data?.documents?.length ?? 0) === 0 ? (
          <li className="text-slate-500">No documents uploaded yet.</li>
        ) : null}
      </ul>
      <form onSubmit={onUpload} className="flex flex-col gap-3">
        <label className="text-sm text-slate-300">
          Document type
          <select
            className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
          >
            <option value="ID_FRONT">ID front</option>
            <option value="ID_BACK">ID back</option>
            <option value="SELFIE">Selfie</option>
            <option value="PROOF_OF_ADDRESS">Proof of address</option>
          </select>
        </label>
        <input name="file" type="file" accept="image/*,.pdf" required />
        <button
          type="submit"
          className="rounded bg-slate-700 px-4 py-2 text-sm text-white"
        >
          Upload document
        </button>
      </form>
      <button
        type="button"
        onClick={() => void onSubmit()}
        className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950"
      >
        Submit for review
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
    </InvestorPage>
  );
}
