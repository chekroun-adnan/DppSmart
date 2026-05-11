import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import {
  getTechnicalSheets, createTechnicalSheet, updateTechnicalSheet, deleteTechnicalSheet,
  getMaterialItems, saveMaterialItems, getOperationItems, saveOperationItems,
  getMaterialStocks, createMaterialStock, updateMaterialStock, deleteMaterialStock,
  getTsOperations, createTsOperation, updateTsOperation, deleteTsOperation,
  getAvailableProducts,
  getMyOrganizations,
  getMainOrganizations,
  getSubOrganizations,
} from "../services/authService";
import AuditHistoryModal from "../components/AuditHistoryModal";

const ROLE = () => (localStorage.getItem("userRole") || "").toUpperCase();
const canEdit = () => ["ADMIN", "SUBADMIN"].includes(ROLE());

function Badge({ type }) {
  const styles = {
    MATERIAL_SHEET: "status-emerald",
    OPERATION_SHEET: "status-blue",
  };
  const labels = { MATERIAL_SHEET: "Material Sheet", OPERATION_SHEET: "Operation Sheet" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[type] || "status-slate"}`}>
      {labels[type] || type}
    </span>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800/80 focus:ring-4 focus:ring-brand-500/10"
      {...rest}
    />
  );
}

function Select({ value, onChange, children, ...rest }) {
  return (
    <select
      value={value ?? ""}
      onChange={onChange}
      className="h-10 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-3 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]"
      {...rest}
    >
      {children}
    </select>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
      </div>
    </div>
  );
}

async function generateSheetPdf({ sheet, product, org, matItems, opItems, logoBase64 }) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const isMaterial = sheet?.type === "MATERIAL_SHEET";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).toUpperCase();

  const productName = product ? (product.productName || product.variantName || "—") : "—";
  const productDesc = sheet?.description || "";
  const orgName = org?.name || "—";

  const logoHeight = 15;
  const logoWidth = 15;
  const logoX = margin;
  const logoY = 10;
  if (logoBase64) {
    const format = logoBase64.includes("image/jpeg") || logoBase64.includes("image/jpg") ? "JPEG" : "PNG";
    doc.addImage(logoBase64, format, logoX, logoY, logoWidth, logoHeight);
  }
  const titleX = logoBase64 ? logoX + logoWidth + 5 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("TECHNICAL DATA SHEET", titleX, logoY + logoHeight / 2 + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(today, pageW - margin, logoY + 5, { align: "right" });

  const orgY = logoY + logoHeight + 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(orgName, margin, orgY);

  const infoTableTop = orgY + 10;
  const productIdVal = product ? (product.id || "—") : "—";
    autoTable(doc, {
    startY: infoTableTop,
    head: [],
    body: [
      ["Product ID", productIdVal],
      ["Product Name", productName],
      ["Product Description", productDesc || "—"],
    ],
    theme: "grid",
    headStyles: { fillColor: [255, 255, 255] },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fillColor: [248, 250, 252], textColor: [15, 23, 42] },
      1: { cellWidth: contentW - 40 },
    },
    margin: { left: margin, right: margin },
    styles: { lineColor: [226, 232, 240], lineWidth: 0.3 },
  });

  const propsTableTop = doc.lastAutoTable.finalY + 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(isMaterial ? "BILL OF MATERIALS" : "PRODUCTION ROUTING", margin, propsTableTop);

  if (isMaterial) {
    autoTable(doc, {
      startY: propsTableTop + 4,
      head: [["#", "MATERIAL", "REFERENCE", "QTY", "%", "UNIT", "NOTES"]],
      body: matItems.length > 0
        ? matItems.map((item, i) => [
            i + 1,
            item.materialName || item.materialId || "—",
            item.materialReference || "—",
            item.quantity ?? "—",
            item.percentage != null ? `${item.percentage}%` : "—",
            item.unit || "—",
            item.notes || "—",
          ])
        : [["", "No materials added", "", "", "", "", ""]],
      theme: "grid",
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 15, halign: "right" },
        4: { cellWidth: 10, halign: "right" },
        5: { cellWidth: 15 },
      },
      margin: { left: margin, right: margin },
      styles: { lineColor: [226, 232, 240], lineWidth: 0.3 },
      foot: matItems.length > 0
        ? [[{ content: `Total: ${matItems.length} items`, colSpan: 7, styles: { fillColor: [241, 245, 249], fontStyle: "bold", fontSize: 7 } }]]
        : undefined,
    });
  } else {
    autoTable(doc, {
      startY: propsTableTop + 4,
      head: [["STEP", "OPERATION", "OPERATOR", "DURATION (MIN)", "NOTES"]],
      body: opItems.length > 0
        ? opItems.map((item, i) => [
            item.stepOrder ?? i + 1,
            item.operationName || item.operationId || "—",
            item.userName || item.userId || "—",
            item.durationEstimate != null ? item.durationEstimate : "—",
            item.notes || "—",
          ])
        : [["", "No operations added", "", "", ""]],
      theme: "grid",
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        halign: "center",
        cellPadding: 3,
      },
      bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59], cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 50 },
        3: { cellWidth: 28, halign: "right" },
      },
      margin: { left: margin, right: margin },
      styles: { lineColor: [226, 232, 240], lineWidth: 0.3 },
      foot: opItems.length > 0
        ? [[{
            content: `Total: ${opItems.length} steps | ${opItems.reduce((s, r) => s + (parseFloat(r.durationEstimate) || 0), 0)} min`,
            colSpan: 5,
            styles: { fillColor: [241, 245, 249], fontStyle: "bold", fontSize: 7 },
          }]]
        : undefined,
    });
  }

  const glossaryTop = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DEFINITIONS", margin, glossaryTop);

  const definitions = isMaterial
    ? [
        { term: "Material", def: "Raw material or component used in the product." },
        { term: "Reference", def: "Internal reference code or identifier for the material." },
        { term: "Qty", def: "Quantity of the material required per unit." },
        { term: "%", def: "Percentage of total material composition." },
        { term: "Unit", def: "Measurement unit (e.g., kg, m, pcs)." },
      ]
    : [
        { term: "Step", def: "Sequential order of the operation in the production process." },
        { term: "Operation", def: "Specific task or process performed during production." },
        { term: "Operator", def: "User or role responsible for performing the operation." },
        { term: "Duration", def: "Estimated time in minutes to complete the operation." },
      ];

  let glossaryY = glossaryTop + 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  for (const item of definitions) {
    if (glossaryY > 275) break;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`• ${item.term}`, margin, glossaryY);
    const termWidth = doc.getTextWidth(`${item.term} - `);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(item.def, margin + termWidth + 2, glossaryY);
    glossaryY += 5;
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    const dppUrl = product ? `${window.location.origin}/passport/${product.id}` : "N/A";
    doc.text(`Scan for DPP: ${dppUrl}`, margin, pageH - 18);
    doc.text(`Generated on ${today} · SmartTex Digital Product Passport`, margin, pageH - 8);
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const filename = `${(sheet?.name || "technical_sheet").replace(/\s+/g, "_")}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename };
}

export default function TechnicalSheetsPage() {
  const { t } = useTranslation();

  const [sheets, setSheets] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [operations, setOperations] = useState([]);
  const [products, setProducts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState(null);
  const [activeSheet, setActiveSheet] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);
  const [auditTrail, setAuditTrail] = useState({});
  const [auditModalSheet, setAuditModalSheet] = useState(null);
  const [historyId, setHistoryId] = useState(null);

  const [sheetDraft, setSheetDraft] = useState({ name: "", type: "MATERIAL_SHEET", description: "", organizationId: "", productId: "" });
  const [matItems, setMatItems] = useState([]);
  const [opItems, setOpItems] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ name: "", referenceCode: "", quantity: "", minimumThreshold: "", unit: "pcs", organizationId: "" });
  const [newOperation, setNewOperation] = useState({ name: "", description: "", defaultDuration: "", organizationId: "" });
  const [saving, setSaving] = useState(false);

  const [editMaterial, setEditMaterial] = useState(null);
  const [editOperation, setEditOperation] = useState(null);

  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  const orgId = localStorage.getItem("orgId") || "";

  useEffect(() => {
    if (orgId || ROLE() === "ADMIN") return;
    getMyOrganizations()
      .then((data) => {
        const orgs = Array.isArray(data) ? data : [];
        if (orgs.length > 0) {
          localStorage.setItem("orgId", orgs[0].id);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch("/iks.png");
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("Failed to load logo", e);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          if (canEdit()) openCreate();
        } else if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          if (selectedSheets.length > 0) {
            const firstSheet = sheets.find(s => s.id === selectedSheets[0]);
            if (firstSheet) openPdf(firstSheet);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSheets, sheets]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, m, o, p, orgsData] = await Promise.all([
        getTechnicalSheets(),
        getMaterialStocks(),
        getTsOperations(),
        getAvailableProducts().catch(() => []),
        ROLE() === "ADMIN"
          ? Promise.all([getMainOrganizations(), getSubOrganizations()])
              .then(([main, sub]) => [...(Array.isArray(main) ? main : []), ...(Array.isArray(sub) ? sub : [])])
              .catch(() => [])
          : getMyOrganizations().catch(() => []),
      ]);
      setSheets(Array.isArray(s) ? s : []);
      setMaterials(Array.isArray(m) ? m : []);
      setOperations(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(p) ? p : []);
      setOrgs(Array.isArray(orgsData) ? orgsData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadAuditTrail(); }, [load]);

  function getProductName(productId) {
    if (!productId) return null;
    const p = products.find(p => p.id === productId);
    return p ? (p.productName || p.variantName || productId) : productId;
  }

  function getOrgName(orgIdVal) {
    const o = orgs.find(o => o.id === orgIdVal);
    return o || null;
  }

  function logAuditEntry(sheetId, action, details) {
    const userEmail = localStorage.getItem("userEmail") || "Unknown";
    const entry = {
      id: `${sheetId}_${Date.now()}`,
      sheetId,
      action,
      details,
      user: userEmail,
      timestamp: new Date().toISOString(),
    };
    setAuditTrail(prev => ({
      ...prev,
      [sheetId]: [...(prev[sheetId] || []), entry],
    }));
    try {
      const stored = JSON.parse(localStorage.getItem("sheetAuditTrail") || "{}");
      stored[sheetId] = [...(stored[sheetId] || []), entry];
      localStorage.setItem("sheetAuditTrail", JSON.stringify(stored));
    } catch (e) {
      console.error("Failed to persist audit trail", e);
    }
  }

  function loadAuditTrail() {
    try {
      const stored = JSON.parse(localStorage.getItem("sheetAuditTrail") || "{}");
      setAuditTrail(stored);
    } catch (e) {
      console.error("Failed to load audit trail", e);
    }
  }

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function openCreate() {
    setError("");
    setSheetDraft({ name: "", type: "MATERIAL_SHEET", description: "", organizationId: orgId, productId: "" });
    setMatItems([]);
    setOpItems([]);
    setModal("create");
  }

  function openEdit(sheet) {
    setError("");
    setActiveSheet(sheet);
    setSheetDraft({ name: sheet.name, type: sheet.type, description: sheet.description || "", organizationId: sheet.organizationId, productId: sheet.productId || "" });
    setModal("edit");
  }

  async function openMaterialItems(sheet) {
    setActiveSheet(sheet);
    try {
      const items = await getMaterialItems(sheet.id);
      setMatItems(Array.isArray(items) ? items.map(item => ({ ...item, percentage: item.percentage ?? "" })) : []);
    } catch { setMatItems([]); }
    setModal("material-items");
  }

  async function openOperationItems(sheet) {
    setActiveSheet(sheet);
    try {
      const items = await getOperationItems(sheet.id);
      setOpItems(Array.isArray(items) ? items : []);
    } catch { setOpItems([]); }
    setModal("operation-items");
  }

  async function openPdf(sheet) {
    let matItemsData = [];
    let opItemsData = [];
    try {
      if (sheet.type === "MATERIAL_SHEET") {
        matItemsData = await getMaterialItems(sheet.id).catch(() => []);
      } else {
        opItemsData = await getOperationItems(sheet.id).catch(() => []);
      }
    } catch { /* ignore */ }
    const product = products.find(p => p.id === sheet.productId) || null;
    const org = getOrgName(sheet.organizationId);
    const { blob, filename } = await generateSheetPdf({ sheet, product, org, matItems: matItemsData, opItems: opItemsData, logoBase64 });
    const url = URL.createObjectURL(blob);
    setPdfPreview({ url, filename, sheetName: sheet.name });
  }

  async function handleSaveSheet() {
    setError("");
    if (!sheetDraft.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!sheetDraft.organizationId.trim()) {
      setError("Organization is required");
      return;
    }
    setSaving(true);
    try {
      if (modal === "create") {
        const created = await createTechnicalSheet(sheetDraft);
        const sheetId = created?.id || created?.data?.id;
        if (sheetId) {
          logAuditEntry(sheetId, "CREATED", {
            name: sheetDraft.name,
            type: sheetDraft.type,
            productId: sheetDraft.productId || null,
            organizationId: sheetDraft.organizationId,
          });
          if (sheetDraft.type === "MATERIAL_SHEET" && matItems.length > 0) {
            await saveMaterialItems(sheetId, matItems.map(r => ({
              materialId: r.materialId, quantity: parseFloat(r.quantity) || 0, unit: r.unit, notes: r.notes, percentage: parseFloat(r.percentage) || 0,
            })));
            logAuditEntry(sheetId, "MATERIALS_ADDED", { count: matItems.length });
          } else if (sheetDraft.type === "OPERATION_SHEET" && opItems.length > 0) {
            await saveOperationItems(sheetId, opItems.map(r => ({
              operationId: r.operationId, userId: r.userId,
              stepOrder: parseInt(r.stepOrder) || 1,
              durationEstimate: parseFloat(r.durationEstimate) || null,
              notes: r.notes,
            })));
            logAuditEntry(sheetId, "OPERATIONS_ADDED", { count: opItems.length });
          }
        }
      } else {
        const oldSheet = sheets.find(s => s.id === activeSheet.id);
        const changes = [];
        if (oldSheet.name !== sheetDraft.name) changes.push({ field: "Name", from: oldSheet.name, to: sheetDraft.name });
        if ((oldSheet.description || "") !== sheetDraft.description) changes.push({ field: "Description", from: oldSheet.description || "", to: sheetDraft.description });
        await updateTechnicalSheet(activeSheet.id, sheetDraft);
        if (changes.length > 0) {
          logAuditEntry(activeSheet.id, "UPDATED", { changes });
        }
      }
      setModal(null);
      setSelectedSheets([]);
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      logAuditEntry(activeSheet.id, "DELETED", { name: activeSheet.name, type: activeSheet.type });
      await deleteTechnicalSheet(activeSheet.id);
      setModal(null);
      setSelectedSheets(p => p.filter(id => id !== activeSheet.id));
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function handleDownloadPdf() {
    if (!pdfPreview) return;
    const a = document.createElement("a");
    a.href = pdfPreview.url;
    a.download = pdfPreview.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    closePdfPreview();
  }

  function closePdfPreview() {
    if (pdfPreview?.url) URL.revokeObjectURL(pdfPreview.url);
    setPdfPreview(null);
  }

  async function handleBulkPdfDownload() {
    setSaving(true);
    setError("");
    try {
      const selected = sheets.filter(s => selectedSheets.includes(s.id));
      for (const sheet of selected) {
        let matItemsData = [];
        let opItemsData = [];
        if (sheet.type === "MATERIAL_SHEET") {
          matItemsData = await getMaterialItems(sheet.id).catch(() => []);
        } else {
          opItemsData = await getOperationItems(sheet.id).catch(() => []);
        }
        const product = products.find(p => p.id === sheet.productId) || null;
        const org = getOrgName(sheet.organizationId);
        const { blob, filename } = await generateSheetPdf({ sheet, product, org, matItems: matItemsData, opItems: opItemsData, logoBase64 });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setSelectedSheets([]);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function handleExportCsv() {
    const headers = ["Name", "Type", "Product", "Description", "Created By", "Created At"];
    const rows = sortedSheets.map(sheet => [
      sheet.name,
      sheet.type === "MATERIAL_SHEET" ? "Material Sheet" : "Operation Sheet",
      getProductName(sheet.productId) || "—",
      sheet.description || "—",
      sheet.createdBy || "—",
      sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString() : "—",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `technical_sheets_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function addMatRow() {
    setMatItems(p => [...p, { materialId: "", quantity: "", unit: "", notes: "", percentage: "" }]);
  }

  function updateMatRow(i, field, val) {
    setMatItems(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function removeMatRow(i) {
    setMatItems(p => p.filter((_, idx) => idx !== i));
  }

  async function handleSaveMatItems() {
    setError("");
    const totalPercentage = matItems.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError("Material percentages must sum to 100%");
      return;
    }
    setSaving(true);
    try {
      const oldItems = await getMaterialItems(activeSheet.id).catch(() => []);
      await saveMaterialItems(activeSheet.id, matItems.map(r => ({
        materialId: r.materialId, quantity: parseFloat(r.quantity) || 0, unit: r.unit, notes: r.notes, percentage: parseFloat(r.percentage) || 0,
      })));
      logAuditEntry(activeSheet.id, "MATERIALS_UPDATED", { count: matItems.length, changes: matItems.length !== oldItems.length ? "Items modified" : "Items updated" });
      setModal(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function addOpRow() {
    setOpItems(p => [...p, { operationId: "", userId: "", stepOrder: p.length + 1, durationEstimate: "", notes: "" }]);
  }

  function updateOpRow(i, field, val) {
    setOpItems(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function removeOpRow(i) {
    setOpItems(p => p.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, stepOrder: idx + 1 })));
  }

  async function handleSaveOpItems() {
    setSaving(true);
    try {
      const oldItems = await getOperationItems(activeSheet.id).catch(() => []);
      await saveOperationItems(activeSheet.id, opItems.map(r => ({
        operationId: r.operationId, userId: r.userId,
        stepOrder: parseInt(r.stepOrder) || 1,
        durationEstimate: parseFloat(r.durationEstimate) || null,
        notes: r.notes,
      })));
      logAuditEntry(activeSheet.id, "OPERATIONS_UPDATED", { count: opItems.length, changes: opItems.length !== oldItems.length ? "Steps modified" : "Steps updated" });
      setModal(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleCreateMaterial() {
    if (!newMaterial.name.trim() || !newMaterial.unit.trim() || !newMaterial.organizationId.trim()) return;
    setSaving(true);
    try {
      const created = await createMaterialStock({
        name: newMaterial.name,
        referenceCode: newMaterial.referenceCode,
        quantity: parseInt(newMaterial.quantity) || 0,
        minimumThreshold: parseInt(newMaterial.minimumThreshold) || 0,
        unit: newMaterial.unit,
        organizationId: newMaterial.organizationId,
      });
      setMaterials(p => [...p, created]);
      setNewMaterial({ name: "", referenceCode: "", quantity: "", minimumThreshold: "", unit: "pcs", organizationId: "" });
      setModal(activeSheet ? "material-items" : "create");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleCreateOperation() {
    if (!newOperation.name.trim() || !newOperation.organizationId.trim()) return;
    setSaving(true);
    try {
      const created = await createTsOperation({
        ...newOperation,
        defaultDuration: parseFloat(newOperation.defaultDuration) || null,
      });
      setOperations(p => [...p, created]);
      setNewOperation({ name: "", description: "", defaultDuration: "", organizationId: orgId });
      setModal(activeSheet ? "operation-items" : "create");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdateMaterial() {
    if (!editMaterial?.name?.trim() || !editMaterial?.unit?.trim()) return;
    setSaving(true);
    try {
      const updated = await updateMaterialStock(editMaterial.id, {
        id: editMaterial.id,
        name: editMaterial.name,
        referenceCode: editMaterial.referenceCode,
        unit: editMaterial.unit,
        quantity: parseInt(editMaterial.quantity) || 0,
        minimumThreshold: parseInt(editMaterial.minimumThreshold) || 0,
      });
      setMaterials(p => p.map(m => m.id === updated.id ? updated : m));
      setEditMaterial(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteMaterial(id) {
    setSaving(true);
    try {
      await deleteMaterialStock(id);
      setMaterials(p => p.filter(m => m.id !== id));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleUpdateOperation() {
    if (!editOperation?.name?.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTsOperation(editOperation.id, {
        name: editOperation.name,
        description: editOperation.description,
        defaultDuration: parseFloat(editOperation.defaultDuration) || null,
      });
      setOperations(p => p.map(o => o.id === updated.id ? updated : o));
      setEditOperation(null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteOperation(id) {
    setSaving(true);
    try {
      await deleteTsOperation(id);
      setOperations(p => p.filter(o => o.id !== id));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function openNewMaterial() {
    const contextOrgId = activeSheet?.organizationId || sheetDraft.organizationId || orgId;
    setNewMaterial({ name: "", referenceCode: "", quantity: "", minimumThreshold: "", unit: "pcs", organizationId: contextOrgId });
    setModal("new-material");
  }

  function openNewOperation() {
    const contextOrgId = activeSheet?.organizationId || sheetDraft.organizationId || orgId;
    setNewOperation({ name: "", description: "", defaultDuration: "", organizationId: contextOrgId });
    setModal("new-operation");
  }

  const filtered = sheets.filter(s => {
    if (filterType !== "ALL" && s.type !== filterType) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sortedSheets = [...filtered].sort((a, b) => {
    if (sortField === "name") {
      return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortField === "type") {
      return sortDirection === "asc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
    } else if (sortField === "date") {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("technicalSheets.title")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("technicalSheets.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSheets.length > 0 && (
              <button onClick={handleBulkPdfDownload} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-6-6m6 6l6-6M4 20h16" />
                </svg>
                Download Selected ({selectedSheets.length})
              </button>
            )}
            <button onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-6-6m6 6l6-6M4 20h16" />
              </svg>
              Export CSV
            </button>
            {canEdit() && (
              <button onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("technicalSheets.createSheet")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("common.search")}
            className="h-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 dark:text-slate-100 px-3 text-sm outline-none focus:border-brand-500 dark:focus:bg-slate-800 focus:ring-2 focus:ring-brand-500/10 w-56" />

          {["ALL", "MATERIAL_SHEET", "OPERATION_SHEET"].map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`h-9 rounded-xl px-4 text-sm font-semibold transition-colors ${filterType === f ? "bg-brand-600 text-white" : "border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              {f === "ALL" ? "All" : f === "MATERIAL_SHEET" ? t("technicalSheets.materialSheet") : t("technicalSheets.operationSheet")}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : sortedSheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-800/40 py-16 text-slate-400 dark:text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">{t("technicalSheets.noSheets")}</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-800 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={sortedSheets.length > 0 && selectedSheets.length === sortedSheets.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSheets(sortedSheets.map(s => s.id));
                        } else {
                          setSelectedSheets([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("name")}>
                    {t("technicalSheets.name")} {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("type")}>
                    {t("technicalSheets.type")} {sortField === "type" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left cursor-pointer select-none" onClick={() => handleSort("date")}>
                    Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left">{t("technicalSheets.description")}</th>
                  <th className="px-4 py-3 text-left">Created By</th>
                  <th className="px-4 py-3 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.05]">
                {sortedSheets.map(sheet => (
                  <tr key={sheet.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSheets.includes(sheet.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSheets(p => [...p, sheet.id]);
                          } else {
                            setSelectedSheets(p => p.filter(id => id !== sheet.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{sheet.name}</td>
                    <td className="px-4 py-3"><Badge type={sheet.type} /></td>
                    <td className="px-4 py-3">
                      {sheet.productId ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 dark:bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          {getProductName(sheet.productId)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {sheet.createdAt ? new Date(sheet.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{sheet.description || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{sheet.createdBy ? sheet.createdBy.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openPdf(sheet)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          PDF
                        </button>

                        {sheet.type === "MATERIAL_SHEET" && canEdit() && (
                          <button onClick={() => openMaterialItems(sheet)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                            {t("technicalSheets.editMaterials")}
                          </button>
                        )}
                        {sheet.type === "OPERATION_SHEET" && canEdit() && (
                          <button onClick={() => openOperationItems(sheet)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                            {t("technicalSheets.editOperations")}
                          </button>
                        )}

                        <button onClick={() => setAuditModalSheet(sheet)} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Audit Trail">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </button>

                        {ROLE() === "ADMIN" && (
                          <button onClick={() => setHistoryId(sheet.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="View History">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {canEdit() && (
                          <>
                            <button onClick={() => openEdit(sheet)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => { setActiveSheet(sheet); setModal("delete"); }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Sheet Modal ── */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {modal === "create" ? t("technicalSheets.createSheet") : t("technicalSheets.editSheet")}
              </h2>
              <button onClick={() => { setError(""); setModal(null); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-4 w-1 rounded-full bg-brand-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Sheet Information</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FieldGroup label={t("technicalSheets.name")}>
                      <Input value={sheetDraft.name} onChange={e => setSheetDraft(p => ({ ...p, name: e.target.value }))} placeholder={t("technicalSheets.namePlaceholder")} />
                    </FieldGroup>
                  </div>
                  {modal === "create" && (
                    <>
                      <FieldGroup label={t("technicalSheets.type")}>
                        <Select value={sheetDraft.type} onChange={e => {
                          setSheetDraft(p => ({ ...p, type: e.target.value }));
                          setMatItems([]);
                          setOpItems([]);
                        }}>
                          <option value="MATERIAL_SHEET">{t("technicalSheets.materialSheet")}</option>
                          <option value="OPERATION_SHEET">{t("technicalSheets.operationSheet")}</option>
                        </Select>
                      </FieldGroup>
                      <FieldGroup label={t("common.organization")}>
                        <Select value={sheetDraft.organizationId} onChange={e => setSheetDraft(p => ({ ...p, organizationId: e.target.value }))}>
                          <option value="">— Select organization —</option>
                          {orgs.map(org => (
                            <option key={org.id} value={org.id}>{org.name || org.id}</option>
                          ))}
                        </Select>
                      </FieldGroup>
                      <div className="col-span-2">
                        <FieldGroup label="Product">
                          <Select value={sheetDraft.productId} onChange={e => setSheetDraft(p => ({ ...p, productId: e.target.value }))}>
                            <option value="">— Select product (optional) —</option>
                            {products.map(prod => (
                              <option key={prod.id} value={prod.id}>
                                {prod.productName || prod.variantName || prod.id}
                                {prod.sku ? ` · ${prod.sku}` : ""}
                              </option>
                            ))}
                          </Select>
                        </FieldGroup>
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <FieldGroup label={t("technicalSheets.description")}>
                      <textarea value={sheetDraft.description} onChange={e => setSheetDraft(p => ({ ...p, description: e.target.value }))}
                        rows={2} placeholder={t("technicalSheets.descriptionPlaceholder")}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 dark:focus:bg-slate-800/80 focus:ring-4 focus:ring-brand-500/10 resize-none" />
                    </FieldGroup>
                  </div>
                </div>
              </div>

              {modal === "create" && (
                sheetDraft.type === "MATERIAL_SHEET" ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-1 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Bill of Materials</span>
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{matItems.length} items</span>
                      </div>
                      <button onClick={openNewMaterial} className="text-xs font-semibold text-brand-600 hover:underline">
                        + {t("technicalSheets.newMaterial")}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {matItems.length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-6 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl">
                          No materials yet — click "+ Add Material" to begin
                        </p>
                      )}
                      {matItems.map((row, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-3">
                          <div className="col-span-3">
                            <Select value={row.materialId} onChange={e => updateMatRow(i, "materialId", e.target.value)}>
                              <option value="">{t("technicalSheets.selectMaterial")}</option>
                              {materials.map(m => <option key={m.id} value={m.id}>{m.name}{m.referenceCode ? ` (${m.referenceCode})` : ""}</option>)}
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Input type="number" value={row.quantity} onChange={e => updateMatRow(i, "quantity", e.target.value)} placeholder={t("technicalSheets.qty")} />
                          </div>
                          <div className="col-span-1">
                            <Input type="number" value={row.percentage} onChange={e => updateMatRow(i, "percentage", e.target.value)} placeholder="%" />
                          </div>
                          <div className="col-span-2">
                            <Input value={row.unit} onChange={e => updateMatRow(i, "unit", e.target.value)} placeholder={t("technicalSheets.unit")} />
                          </div>
                          <div className="col-span-3">
                            <Input value={row.notes} onChange={e => updateMatRow(i, "notes", e.target.value)} placeholder={t("technicalSheets.notes")} />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => removeMatRow(i)} className="text-red-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={addMatRow}
                        className="w-full rounded-xl border border-dashed border-emerald-300 py-2 text-sm text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                        + {t("technicalSheets.addMaterial")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-1 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Production Routing</span>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">{opItems.length} steps</span>
                      </div>
                      <button onClick={openNewOperation} className="text-xs font-semibold text-brand-600 hover:underline">
                        + {t("technicalSheets.newOperation")}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {opItems.length === 0 && (
                        <p className="text-sm text-slate-400 italic text-center py-6 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl">
                          No steps yet — click "+ Add Step" to begin
                        </p>
                      )}
                      {opItems.map((row, i) => (
                        <div key={i} className="rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300">{row.stepOrder}</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Select value={row.operationId} onChange={e => updateOpRow(i, "operationId", e.target.value)}>
                                <option value="">{t("technicalSheets.selectOperation")}</option>
                                {operations.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                              </Select>
                              <Input type="number" value={row.durationEstimate} onChange={e => updateOpRow(i, "durationEstimate", e.target.value)} placeholder={t("technicalSheets.duration")} />
                            </div>
                            <button onClick={() => removeOpRow(i)} className="text-red-400 hover:text-red-600 shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pl-8">
                            <Input value={row.userId} onChange={e => updateOpRow(i, "userId", e.target.value)} placeholder={t("technicalSheets.assignedUserId")} />
                            <Input value={row.notes} onChange={e => updateOpRow(i, "notes", e.target.value)} placeholder={t("technicalSheets.notes")} />
                          </div>
                        </div>
                      ))}
                      <button onClick={addOpRow}
                        className="w-full rounded-xl border border-dashed border-blue-300 py-2 text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                        + {t("technicalSheets.addStep")}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <button onClick={() => { setError(""); setModal(null); }} className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                {t("common.cancel")}
              </button>
              <button onClick={handleSaveSheet} disabled={saving}
                className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? t("common.saving") : modal === "create" ? t("common.create") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {modal === "delete" && activeSheet && (
        <Modal title={t("common.confirmDelete")} onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600">
            {t("technicalSheets.deleteConfirm", { name: activeSheet.name })}
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              {t("common.cancel")}
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="h-10 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? t("common.deleting") : t("common.delete")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Material Items Editor ── */}
      {modal === "material-items" && activeSheet && (
        <Modal title={`${activeSheet.name} — ${t("technicalSheets.materialItems")}`} onClose={() => setModal(null)}>
          {activeSheet.productId && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm text-emerald-800">
                Product: <strong>{getProductName(activeSheet.productId)}</strong>
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("technicalSheets.billOfMaterials")}</span>
            <button onClick={openNewMaterial} className="text-xs font-semibold text-brand-600 hover:underline">
              + {t("technicalSheets.newMaterial")}
            </button>
          </div>

          <div className="space-y-2">
            {matItems.length === 0 && (
              <p className="text-sm text-slate-400 italic">{t("technicalSheets.noMaterialItems")}</p>
            )}
            {matItems.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50 p-3">
                <div className="col-span-3">
                  <Select value={row.materialId} onChange={e => updateMatRow(i, "materialId", e.target.value)}>
                    <option value="">{t("technicalSheets.selectMaterial")}</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} {m.referenceCode ? `(${m.referenceCode})` : ""}</option>)}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input type="number" value={row.quantity} onChange={e => updateMatRow(i, "quantity", e.target.value)} placeholder={t("technicalSheets.qty")} />
                </div>
                <div className="col-span-1">
                  <Input type="number" value={row.percentage} onChange={e => updateMatRow(i, "percentage", e.target.value)} placeholder="%" />
                </div>
                <div className="col-span-2">
                  <Input value={row.unit} onChange={e => updateMatRow(i, "unit", e.target.value)} placeholder={t("technicalSheets.unit")} />
                </div>
                <div className="col-span-3">
                  <Input value={row.notes} onChange={e => updateMatRow(i, "notes", e.target.value)} placeholder={t("technicalSheets.notes")} />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => removeMatRow(i)} className="text-red-400 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addMatRow}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600">
              + {t("technicalSheets.addMaterial")}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              {t("common.cancel")}
            </button>
            <button onClick={handleSaveMatItems} disabled={saving}
              className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Operation Items Editor ── */}
      {modal === "operation-items" && activeSheet && (
        <Modal title={`${activeSheet.name} — ${t("technicalSheets.operationItems")}`} onClose={() => setModal(null)}>
          {activeSheet.productId && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm text-blue-800">
                Product: <strong>{getProductName(activeSheet.productId)}</strong>
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("technicalSheets.productionRouting")}</span>
            <button onClick={openNewOperation} className="text-xs font-semibold text-brand-600 hover:underline">
              + {t("technicalSheets.newOperation")}
            </button>
          </div>

          <div className="space-y-2">
            {opItems.length === 0 && (
              <p className="text-sm text-slate-400 italic">{t("technicalSheets.noOperationItems")}</p>
            )}
            {opItems.map((row, i) => (
              <div key={i} className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-xs font-bold text-brand-700 dark:text-brand-300">{row.stepOrder}</span>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Select value={row.operationId} onChange={e => updateOpRow(i, "operationId", e.target.value)}>
                      <option value="">{t("technicalSheets.selectOperation")}</option>
                      {operations.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </Select>
                    <Input type="number" value={row.durationEstimate} onChange={e => updateOpRow(i, "durationEstimate", e.target.value)} placeholder={t("technicalSheets.duration")} />
                  </div>
                  <button onClick={() => removeOpRow(i)} className="text-red-400 hover:text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={row.userId} onChange={e => updateOpRow(i, "userId", e.target.value)} placeholder={t("technicalSheets.assignedUserId")} />
                  <Input value={row.notes} onChange={e => updateOpRow(i, "notes", e.target.value)} placeholder={t("technicalSheets.notes")} />
                </div>
              </div>
            ))}
            <button onClick={addOpRow}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600">
              + {t("technicalSheets.addStep")}
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              {t("common.cancel")}
            </button>
            <button onClick={handleSaveOpItems} disabled={saving}
              className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Material Library ── */}
      {modal === "new-material" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Material Stock</h2>
              <button onClick={() => { setEditMaterial(null); setModal(activeSheet ? "material-items" : "create"); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {materials.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">In Stock ({materials.length})</p>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {materials.map(m => {
                      const isLow = m.quantity != null && m.minimumThreshold != null && m.quantity <= m.minimumThreshold;
                      return (
                      <div key={m.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isLow ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5" : "border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50"}`}>
                        {editMaterial?.id === m.id ? (
                          <>
                            <div className="flex-1 grid grid-cols-5 gap-2">
                              <Input value={editMaterial.name} onChange={e => setEditMaterial(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                              <Input value={editMaterial.referenceCode || ""} onChange={e => setEditMaterial(p => ({ ...p, referenceCode: e.target.value }))} placeholder="Reference" />
                              <Input type="number" value={editMaterial.quantity ?? ""} onChange={e => setEditMaterial(p => ({ ...p, quantity: e.target.value }))} placeholder="Qty" />
                              <Input type="number" value={editMaterial.minimumThreshold ?? ""} onChange={e => setEditMaterial(p => ({ ...p, minimumThreshold: e.target.value }))} placeholder="Min" />
                              <Input value={editMaterial.unit} onChange={e => setEditMaterial(p => ({ ...p, unit: e.target.value }))} placeholder="Unit" />
                            </div>
                            <button onClick={handleUpdateMaterial} disabled={saving}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50">
                              {saving ? "..." : "Save"}
                            </button>
                            <button onClick={() => setEditMaterial(null)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{m.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {m.referenceCode || "—"} · {m.quantity ?? 0} {m.unit}
                                {isLow && <span className="ml-1 text-amber-600 font-semibold">⚠ Low</span>}
                              </p>
                            </div>
                            <button onClick={() => setEditMaterial({ ...m })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteMaterial(m.id)} disabled={saving}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Add New Material to Stock</p>
                <div className="space-y-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 p-4">
                  <FieldGroup label={t("technicalSheets.materialName")}>
                    <Input value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))} />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label={t("technicalSheets.referenceCode")}>
                      <Input value={newMaterial.referenceCode} onChange={e => setNewMaterial(p => ({ ...p, referenceCode: e.target.value }))} />
                    </FieldGroup>
                    <FieldGroup label={t("technicalSheets.unit")}>
                      <Input value={newMaterial.unit} onChange={e => setNewMaterial(p => ({ ...p, unit: e.target.value }))} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label={t("orders.quantity")}>
                      <Input type="number" value={newMaterial.quantity} onChange={e => setNewMaterial(p => ({ ...p, quantity: e.target.value }))} />
                    </FieldGroup>
                    <FieldGroup label={t("technicalSheets.minThreshold")}>
                      <Input type="number" value={newMaterial.minimumThreshold} onChange={e => setNewMaterial(p => ({ ...p, minimumThreshold: e.target.value }))} />
                    </FieldGroup>
                  </div>
                  <FieldGroup label={t("common.organization")}>
                    <Select value={newMaterial.organizationId} onChange={e => setNewMaterial(p => ({ ...p, organizationId: e.target.value }))}>
                      <option value="">— Select organization —</option>
                      {orgs.map(org => (
                        <option key={org.id} value={org.id}>{org.name || org.id}</option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <div className="flex justify-end">
                    <button onClick={handleCreateMaterial} disabled={saving}
                      className="h-9 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {saving ? t("common.saving") : "+ Add to Stock"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={() => { setEditMaterial(null); setModal(activeSheet ? "material-items" : "create"); }}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Operation Library ── */}
      {modal === "new-operation" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Operation Library</h2>
              <button onClick={() => { setEditOperation(null); setModal(activeSheet ? "operation-items" : "create"); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {operations.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Existing Operations</p>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {operations.map(op => (
                      <div key={op.id} className="flex items-center gap-2 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
                        {editOperation?.id === op.id ? (
                          <>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input value={editOperation.name} onChange={e => setEditOperation(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                              <Input value={editOperation.description || ""} onChange={e => setEditOperation(p => ({ ...p, description: e.target.value }))} placeholder="Description" />
                              <Input type="number" value={editOperation.defaultDuration || ""} onChange={e => setEditOperation(p => ({ ...p, defaultDuration: e.target.value }))} placeholder="Duration (min)" />
                            </div>
                            <button onClick={handleUpdateOperation} disabled={saving}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50">
                              {saving ? "..." : "Save"}
                            </button>
                            <button onClick={() => setEditOperation(null)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{op.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {op.description || "—"}
                                {op.defaultDuration ? ` · ${op.defaultDuration} min` : ""}
                              </p>
                            </div>
                            <button onClick={() => setEditOperation({ ...op })}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteOperation(op.id)} disabled={saving}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Add New Operation</p>
                <div className="space-y-3 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4">
                  <FieldGroup label={t("technicalSheets.operationName")}>
                    <Input value={newOperation.name} onChange={e => setNewOperation(p => ({ ...p, name: e.target.value }))} />
                  </FieldGroup>
                  <FieldGroup label={t("technicalSheets.description")}>
                    <Input value={newOperation.description} onChange={e => setNewOperation(p => ({ ...p, description: e.target.value }))} />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label={t("technicalSheets.defaultDuration")}>
                      <Input type="number" value={newOperation.defaultDuration} onChange={e => setNewOperation(p => ({ ...p, defaultDuration: e.target.value }))} />
                    </FieldGroup>
                    <FieldGroup label={t("common.organization")}>
                      <Select value={newOperation.organizationId} onChange={e => setNewOperation(p => ({ ...p, organizationId: e.target.value }))}>
                        <option value="">— Select organization —</option>
                        {orgs.map(org => (
                          <option key={org.id} value={org.id}>{org.name || org.id}</option>
                        ))}
                      </Select>
                    </FieldGroup>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={handleCreateOperation} disabled={saving}
                      className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {saving ? t("common.saving") : "+ Add to Library"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={() => { setEditOperation(null); setModal(activeSheet ? "operation-items" : "create"); }}
                  className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Preview Modal ── */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">PDF Preview</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{pdfPreview.sheetName}</p>
              </div>
              <button onClick={closePdfPreview} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-[60vh] p-4">
              <iframe
                src={pdfPreview.url}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-white/[0.08]"
                title="PDF Preview"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <button onClick={closePdfPreview} className="h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] px-5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={handleDownloadPdf}
                className="h-10 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-6-6m6 6l6-6M4 20h16" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail Modal ── */}
      {auditModalSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Audit Trail</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{auditModalSheet.name} · v{auditModalSheet.version || 1}</p>
              </div>
              <button onClick={() => setAuditModalSheet(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {(auditTrail[auditModalSheet.id] || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No audit entries yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...(auditTrail[auditModalSheet.id] || [])].reverse().map(entry => (
                    <div key={entry.id} className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          entry.action === "CREATED" ? "status-emerald" :
                          entry.action === "UPDATED" ? "status-blue" :
                          entry.action === "DELETED" ? "status-red" :
                          entry.action === "STATUS_CHANGE" ? "status-amber" :
                          entry.action === "DUPLICATED_FROM" ? "status-purple" :
                          entry.action.includes("MATERIAL") ? "status-emerald" :
                          entry.action.includes("OPERATION") ? "status-blue" :
                          "status-slate"
                        }`}>
                          {entry.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-[10px] font-bold text-brand-700 dark:text-brand-300">
                          {(entry.user || "U")[0].toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{entry.user}</span>
                      </div>
                      {entry.details && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          {entry.action === "STATUS_CHANGE" && (
                            <p>
                              <span className="font-semibold text-slate-700">{entry.details.from}</span>
                              <span className="mx-1">→</span>
                              <span className="font-semibold text-slate-700">{entry.details.to}</span>
                              {entry.details.comment && <p className="mt-1 italic">"{entry.details.comment}"</p>}
                            </p>
                          )}
                          {entry.action === "UPDATED" && entry.details.changes && (
                            <div className="space-y-1">
                              {entry.details.changes.map((c, i) => (
                                <p key={i}>
                                  <span className="font-semibold text-slate-700">{c.field}:</span>
                                  <span className="line-through text-red-400 ml-1">{c.from || "—"}</span>
                                  <span className="mx-1">→</span>
                                  <span className="text-emerald-600">{c.to || "—"}</span>
                                </p>
                              ))}
                              {entry.details.version && <p className="mt-1">Version: v{entry.details.version}</p>}
                            </div>
                          )}
                          {entry.action === "CREATED" && (
                            <p>Created as {entry.details.type?.replace("_", " ")}</p>
                          )}
                          {entry.action === "DELETED" && (
                            <p>Sheet deleted</p>
                          )}
                          {entry.action === "DUPLICATED_FROM" && (
                            <p>Duplicated from "{entry.details.sourceName}"</p>
                          )}
                          {entry.details.count && (
                            <p>{entry.details.count} {entry.details.count === 1 ? "item" : "items"} recorded</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 dark:border-white/[0.06] px-6 py-4">
              <button onClick={() => setAuditModalSheet(null)} className="h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AuditHistoryModal entityType="TechnicalSheet" entityId={historyId} onClose={() => setHistoryId(null)} />
    </DashboardLayout>
  );
}
