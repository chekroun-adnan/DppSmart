import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import AuditHistoryModal from "../components/AuditHistoryModal";
import {
  createProduct,
  createTechnicalSheet,
  deleteProduct,
  getAvailableProducts,
  getDashboardData,
  importProductsFromCsv,
  updateProduct,
  uploadProductImage,
} from "../services/authService";

const SELECT = "mt-1 h-11 w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 pl-3 pr-10 text-sm text-slate-900 dark:text-slate-100 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzY0NzQ4YiIvPjwvc3ZnPg==')] bg-no-repeat bg-[right_0.75rem_center] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNCA2bDQgNCA0LTRIeiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==')] dark:bg-[right_0.75rem_center]";

const emptyProductDraft = {
  id: "",
  productName: "",
  variantName: "",
  sku: "",
  organizationId: "",
};

function readSupplementEntries(product) {
  const raw = product?.extraFields || product?.supplementalInfo || product?.additionalInfo || {};
  if (!raw || typeof raw !== "object") return [{ key: "", value: "" }];
  const entries = Object.entries(raw).map(([key, value]) => ({
    key: String(key),
    value: value === null || value === undefined ? "" : String(value),
  }));
  return entries.length > 0 ? entries : [{ key: "", value: "" }];
}

function readMaterialsComposition(product) {
  const raw = product?.materialsComposition || [];
  if (!Array.isArray(raw) || raw.length === 0) return [{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }];
  return raw.map(m => ({
    materialName: m.materialName || "",
    percentage: m.percentage?.toString() || "",
    recycledContent: m.recycledContent || false,
    recycledPercentage: m.recycledPercentage?.toString() || "",
  }));
}

function readProductImageUrl(product) {
  if (typeof product?.imageUrl === "string" && product.imageUrl.trim()) return product.imageUrl;
  const extra = product?.extraFields || {};
  if (typeof extra?.imageUrl === "string" && extra.imageUrl.trim()) {
    return extra.imageUrl;
  }
  const additional = product?.additionalInfo || {};
  if (typeof additional?.imageUrl === "string" && additional.imageUrl.trim()) {
    return additional.imageUrl;
  }
  return "";
}

function toSupplementObject(entries) {
  return entries.reduce((acc, item) => {
    const key = item.key.trim();
    if (!key) return acc;
    acc[key] = item.value;
    return acc;
  }, {});
}

function hasSupplementEntries(entries) {
  return entries.some(item => item.key?.trim());
}

function toMaterialsComposition(entries) {
  return entries
    .filter((item) => item.materialName?.trim())
    .map((item) => ({
      materialName: item.materialName.trim(),
      percentage: parseFloat(item.percentage) || 0,
      recycledContent: Boolean(item.recycledContent),
      recycledPercentage: item.recycledContent ? (parseFloat(item.recycledPercentage) || 0) : 0,
    }));
}

function getProductStatus(product) {
  const score = typeof product.aiScore === "number" ? product.aiScore : null;
  const missingCount = Array.isArray(product.aiMissingFields) ? product.aiMissingFields.length : 0;

  if (score !== null && score >= 80 && missingCount <= 2) {
    return { label: "Eco-certified", tone: "status-emerald" };
  }
  return { label: "In review", tone: "status-slate" };
}


function ProductsPage() {
  const navigate = useNavigate();
  const role = (localStorage.getItem("userRole") || "").toUpperCase();
  const canManage = role === "ADMIN" || role === "SUBADMIN";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyMissingFields, setOnlyMissingFields] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState(emptyProductDraft);
  const [createMaterialEntries, setCreateMaterialEntries] = useState([{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }]);
  const [createSupplementEntries, setCreateSupplementEntries] = useState([{ key: "", value: "" }]);
  const [createEndOfLifeInstructions, setCreateEndOfLifeInstructions] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createImageFile, setCreateImageFile] = useState(null);
  const [editingProductId, setEditingProductId] = useState("");
  const [editDraft, setEditDraft] = useState(emptyProductDraft);
  const [editMaterialEntries, setEditMaterialEntries] = useState([{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }]);
  const [editSupplementEntries, setEditSupplementEntries] = useState([{ key: "", value: "" }]);
  const [editEndOfLifeInstructions, setEditEndOfLifeInstructions] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [uploadedImages, setUploadedImages] = useState({});
  const [qrModal, setQrModal] = useState(null);
  const [dppModal, setDppModal] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvOrgId, setCsvOrgId] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [sheetModalProduct, setSheetModalProduct] = useState(null);
  const [sheetDraft, setSheetDraft] = useState({ name: "", type: "MATERIAL_SHEET", description: "" });
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [historyId, setHistoryId] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [productsData, dashboardData] = await Promise.all([
          getAvailableProducts(),
          getDashboardData(),
        ]);

        if (!mounted) return;
        setProducts(Array.isArray(productsData) ? productsData : []);
        const scopedOrganizations = Array.isArray(dashboardData?.organizationScopes)
          ? dashboardData.organizationScopes
          : [];
        setOrganizationOptions(scopedOrganizations);
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message || "Unable to load products.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const searchable = [
        product.productName,
        product.variantName,
        product.sku,
        product.id,
        product.organizationId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const hasMissingFields = Array.isArray(product.aiMissingFields) && product.aiMissingFields.length > 0;
      const matchesSearch = query ? searchable.includes(query) : true;
      const matchesMissingFilter = onlyMissingFields ? hasMissingFields : true;

      return matchesSearch && matchesMissingFilter;
    });
  }, [products, search, onlyMissingFields]);

  const stats = useMemo(() => {
    const total = products.length;
    const inReview = products.filter((product) => getProductStatus(product).label === "In review").length;
    const lowScore = products.filter(
      (product) => typeof product.aiScore === "number" && product.aiScore < 40
    ).length;
    const withQr = products.filter((product) => Boolean(product.qrUrl)).length;
    return { total, inReview, lowScore, withQr };
  }, [products]);

  const handleDeleteProduct = async (productId) => {
    setDeletingProductId(productId);
    setActionError("");
    try {
      await deleteProduct(productId);
      setProducts((current) => current.filter((product) => product.id !== productId));
      setPendingDeleteProduct(null);
    } catch (requestError) {
      setActionError(requestError.message || "Unable to delete this product.");
    } finally {
      setDeletingProductId("");
    }
  };

  const handleStartEdit = (product) => {
    setActionError("");
    setEditingProductId(product.id);
    setEditDraft({
      id: product.id || "",
      productName: product.productName || "",
      variantName: product.variantName || "",
      sku: product.sku || "",
      organizationId: product.organizationId || "",
    });
    setEditMaterialEntries(readMaterialsComposition(product));
    setEditSupplementEntries(readSupplementEntries(product));
    setEditEndOfLifeInstructions(product.endOfLifeInstructions || "");
  };

  const openCreateModal = () => {
    setActionError("");
    setCreateDraft(emptyProductDraft);
    setCreateMaterialEntries([{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }]);
    setCreateSupplementEntries([{ key: "", value: "" }]);
    setCreateEndOfLifeInstructions("");
    setCreateImageFile(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateProduct = async () => {
    setCreatingProduct(true);
    setActionError("");
    try {
      const supplement = toSupplementObject(createSupplementEntries);
      const materials = toMaterialsComposition(createMaterialEntries);
      const createPayload = {
        id: createDraft.id || undefined,
        productName: createDraft.productName,
        variantName: createDraft.variantName || undefined,
        sku: createDraft.sku || undefined,
        organizationId: createDraft.organizationId,
        materialsComposition: materials.length > 0 ? materials : undefined,
        endOfLifeInstructions: createEndOfLifeInstructions || undefined,
      };
      if (hasSupplementEntries(createSupplementEntries)) {
        createPayload.extraFields = supplement;
      }

      const created = await createProduct(createPayload);
      const createdProduct = created?.id ? created : created?.product || createPayload;
      const createdId = createdProduct.id || createdProduct.productId || createDraft.productName;

      if (createImageFile && createdId) {
        const withImage = await uploadProductImage(createdId, createImageFile);
        const imageUrl = readProductImageUrl(withImage);
        if (imageUrl) {
          setUploadedImages((current) => ({ ...current, [createdId]: imageUrl }));
        }
        setProducts((current) => [{ ...createdProduct, ...withImage, id: createdId }, ...current]);
      } else {
        setProducts((current) => [{ ...createdProduct, id: createdId }, ...current]);
      }
      setIsCreateModalOpen(false);
      setCreateImageFile(null);
    } catch (requestError) {
      setActionError(requestError.message || "Unable to create this product.");
    } finally {
      setCreatingProduct(false);
    }
  };

  const openCsvModal = () => {
    setCsvFile(null);
    setCsvOrgId(organizationOptions[0]?.id || "");
    setCsvResult(null);
    setCsvError("");
    setIsCsvModalOpen(true);
  };

  const handleCsvImport = async () => {
    if (!csvFile) { setCsvError("Please select a CSV file."); return; }
    if (!csvOrgId) { setCsvError("Please select an organization."); return; }
    setCsvImporting(true);
    setCsvError("");
    setCsvResult(null);
    try {
      const imported = await importProductsFromCsv(csvFile, csvOrgId);
      const list = Array.isArray(imported) ? imported : [];
      setCsvResult(list);
      setProducts((current) => [...list, ...current]);
    } catch (err) {
      setCsvError(err.message || "Import failed.");
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = [
      "productName", "companyName", "variantName", "sku", "endOfLifeInstructions",
      "material_1_name", "material_1_percentage", "material_1_recycled_content", "material_1_recycled_percentage",
      "material_2_name", "material_2_percentage", "material_2_recycled_content", "material_2_recycled_percentage",
      "countryOfOrigin", "certification",
    ];
    const example = [
      "Lake Sunset Camp Shirt", "Acme Corp", "Size M", "6274_CSBCS", "Machine wash cold",
      "Cotton", "50", "true", "100",
      "Polyester", "50", "false", "",
      "Morocco", "OEKO-TEX",
    ];
    const csv = [headers.join(","), example.join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  function openSheetModal(product) {
    const orgId = product.organizationId || localStorage.getItem("orgId") || "";
    setSheetModalProduct(product);
    setSheetDraft({ name: `${product.productName || "Product"} - Technical Sheet`, type: "MATERIAL_SHEET", description: "", organizationId: orgId });
  }

  async function handleCreateSheet() {
    if (!sheetModalProduct || !sheetDraft.name.trim()) return;
    setCreatingSheet(true);
    setActionError("");
    try {
      const created = await createTechnicalSheet({
        name: sheetDraft.name.trim(),
        type: sheetDraft.type,
        description: sheetDraft.description,
        organizationId: sheetDraft.organizationId,
        productId: sheetModalProduct.id,
      });
      if (!created?.id && !created?.data?.id) {
        setActionError("Sheet created but ID was not returned.");
        return;
      }
      setSheetModalProduct(null);
      setSheetDraft({ name: "", type: "MATERIAL_SHEET", description: "" });
      navigate(`/technical-sheets`);
    } catch (e) {
      setActionError(e.message || "Unable to create technical sheet.");
    } finally {
      setCreatingSheet(false);
    }
  }

  const handleSaveEdit = async (productId) => {
    setSavingEdit(true);
    setActionError("");
    try {
      const currentProduct = products.find((product) => product.id === productId);
      const baseExtraFields = currentProduct?.extraFields || {};
      const materials = toMaterialsComposition(editMaterialEntries);
      const extraFieldsData = toSupplementObject(editSupplementEntries);
      const updatePayload = {
        id: productId,
        productName: editDraft.productName,
        variantName: editDraft.variantName || undefined,
        sku: editDraft.sku || undefined,
        organizationId: editDraft.organizationId,
        materialsComposition: materials.length > 0 ? materials : undefined,
        endOfLifeInstructions: editEndOfLifeInstructions || undefined,
      };
      if (Object.keys(extraFieldsData).length > 0) {
        updatePayload.extraFields = { ...baseExtraFields, ...extraFieldsData };
      }
      const updated = await updateProduct(updatePayload);

      let updatedWithImage = null;
      if (selectedImageFile) {
        updatedWithImage = await uploadProductImage(productId, selectedImageFile);
      }

      setProducts((current) =>
        current.map((product) => {
          if (product.id !== productId) return product;
          const backendProduct =
            (updatedWithImage?.id ? updatedWithImage : updatedWithImage?.product) ||
            (updated?.id ? updated : updated?.product) ||
            null;
          if (backendProduct) {
            return { ...product, ...backendProduct };
          }
          return {
            ...product,
            productName: editDraft.productName,
            variantName: editDraft.variantName,
            sku: editDraft.sku,
          };
        })
      );

      const uploadedImageUrl = readProductImageUrl(updatedWithImage);
      if (uploadedImageUrl) {
        setUploadedImages((current) => ({ ...current, [productId]: uploadedImageUrl }));
      }

      setEditingProductId("");
      setSelectedImageFile(null);
    } catch (requestError) {
      setActionError(requestError.message || "Unable to update this product.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleUploadImage = async (productId, file) => {
    if (!file) return;
    try {
      const withImage = await uploadProductImage(productId, file);
      const imageUrl = readProductImageUrl(withImage);
      if (imageUrl) {
        setUploadedImages((current) => ({ ...current, [productId]: imageUrl }));
        setProducts((current) =>
          current.map((p) =>
            p.id === productId ? { ...p, ...withImage, id: productId } : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  };

  if (role === "CLIENT") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Digital Product Passports</p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Products</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Browse products and access their full Digital Product Passport.</p>
            </div>
            <div className="relative max-w-xs w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 dark:text-slate-100 pl-9 pr-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder="Search products..." />
            </div>
          </section>

          {error && (
            <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-semibold">Products unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
            </section>
          )}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="glass-card overflow-hidden animate-pulse">
                  <div className="h-52 bg-slate-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-8 bg-slate-200 rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-slate-500 font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const imgUrl = uploadedImages[product.id] || readProductImageUrl(product);
                const hasDpp = Boolean(product.dppUrl || product.qrUrl);
                return (
                    <button key={product.id} onClick={() => navigate(`/passport/${product.id}`)} className="glass-card overflow-hidden flex flex-col group hover:shadow-xl transition-all hover:-translate-y-0.5 text-left cursor-pointer">
                      <div className="relative w-full h-[230px] bg-slate-100 overflow-hidden flex-shrink-0 rounded-t-2xl">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={product.productName}
                            className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling.style.display = "flex"; }}
                          />
                        ) : null}
                        <div className={imgUrl ? "hidden absolute inset-0 flex-col items-center justify-center gap-2" : "w-full h-full flex flex-col items-center justify-center gap-2"}>
                          <svg className="w-14 h-14 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs text-slate-400">No image</span>
                        </div>
                      {hasDpp && (
                        <div className="absolute top-3 right-3">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-600 text-white shadow">DPP</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-brand-600 transition-colors truncate">
                        {product.productName || "Unnamed product"}
                      </h3>

                      <div className="mt-2 space-y-1.5">
                        {product.variantName && (
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className="text-xs text-slate-600 truncate">{product.variantName}</span>
                          </div>
                        )}
                        {Array.isArray(product.materialsComposition) && product.materialsComposition.length > 0 && (
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <span className="text-xs text-slate-600 truncate">
                              {product.materialsComposition.map(m => m.materialName).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
            <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Inventory Management</p>
                <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Product Catalog</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage and track your Digital Product Passports across the organization.</p>
              </div>
              {canManage && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={openCsvModal}
                    className="flex items-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import CSV
                  </button>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="btn-primary"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Product
                  </button>
                </div>
              )}
            </section>

            {error ? (
              <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                <p className="font-semibold">Products unavailable</p>
                <p className="mt-1 text-sm">{error}</p>
              </section>
            ) : null}

            <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Passports", value: stats.total, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                { label: "In Review", value: stats.inReview, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: "Low AI Score", value: stats.lowScore, icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
                { label: "QR Ready", value: stats.withQr, icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" }
              ].map((stat) => (
                <article key={stat.label} className="glass-card p-6 flex items-center justify-between group">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-brand-600 transition-colors">{stat.label}</p>
                    <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stat.value}</p>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                    </svg>
                  </div>
                </article>
              ))}
            </section>

            <section className="glass-card overflow-hidden border-slate-200">
              <div className="p-6 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-none">Archive Entries</h3>
                  <div className="relative max-w-xs flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/50 dark:text-slate-100 pl-9 pr-3 text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10" placeholder="Search products..." />
                  </div>
                </div>
                <label className="inline-flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={onlyMissingFields}
                      onChange={(event) => setOnlyMissingFields(event.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Only missing fields</span>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
                      <th className="px-6 py-5 font-bold">Product Details</th>
                      <th className="px-6 py-5 font-bold">Visuals</th>
                      <th className="px-6 py-5 font-bold">DPP Assets</th>
                      {canManage && <th className="px-6 py-5 font-bold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-slate-500">Retrieving catalog...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <p className="text-sm font-medium text-slate-500">No products match your filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        return (
                          <tr key={product.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-6 py-5">
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors">
                                  {product.productName || "Unnamed product"}
                                </p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">{product.id || "No ID"}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  {product.variantName && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded">
                                      {product.variantName}
                                    </span>
                                  )}
                                  {product.sku && (
                                    <span className="text-[10px] font-bold text-slate-500 italic">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                  {Array.isArray(product.materialsComposition) && product.materialsComposition.length > 0 && (
                                    <span className="text-[10px] font-bold text-slate-500 italic">
                                      {product.materialsComposition.map(m => m.materialName).join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {uploadedImages[product.id] || readProductImageUrl(product) ? (
                                  <img
                                    src={uploadedImages[product.id] || readProductImageUrl(product)}
                                    alt="Product"
                                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-white shadow-sm"
                                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    N/A
                                  </div>
                                )}
                                {canManage && (
                                  <label className="cursor-pointer p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(event) => handleUploadImage(product.id, event.target.files?.[0] || null)}
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                {product.dppUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setDppModal(product)}
                                    className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white transition-all shadow-sm ring-1 ring-brand-500/10"
                                    title="View Digital Product Passport"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                ) : (
                                  <div className="p-2 rounded-xl bg-slate-50 text-slate-300 cursor-not-allowed" title="No DPP yet">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                )}
                                {product.qrUrl && (
                                  <button
                                    onClick={() => setQrModal(product)}
                                    className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm ring-1 ring-emerald-500/10"
                                    title="View QR Code"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                            {canManage && (
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => openSheetModal(product)}
                                    className="p-2 rounded-xl bg-white border border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm transition-all"
                                    title="Create Technical Sheet"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(product)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:shadow-sm transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {role === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => setHistoryId(product.id)}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:shadow-sm transition-all"
                      title="View History"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDeleteProduct(product)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-sm transition-all"
                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
      </div>

      <AuditHistoryModal entityType="Product" entityId={historyId} onClose={() => setHistoryId(null)} />

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">New Product</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Fill in the product information to create a new entry.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Product Name
                <input
                  value={createDraft.productName}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, productName: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Variant Name
                <input
                  value={createDraft.variantName}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, variantName: event.target.value }))
                  }
                  placeholder="e.g. Size S, Blue"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                SKU
                <input
                  value={createDraft.sku}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="e.g. PRD-001-BLU"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Organization
                <select
                  value={createDraft.organizationId}
                  onChange={(event) =>
                    setCreateDraft((current) => ({ ...current, organizationId: event.target.value }))
                  }
                  className={SELECT}
                >
                  <option value="">Select organization</option>
                  {organizationOptions.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                Materials Composition
                <div className="mt-2 space-y-2">
                  {createMaterialEntries.map((entry, index) => (
                    <div key={`create-mat-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_0.5fr_0.5fr_0.5fr_auto]">
                      <input
                        value={entry.materialName}
                        onChange={(event) =>
                          setCreateMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, materialName: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Material name"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <input
                        value={entry.percentage}
                        onChange={(event) =>
                          setCreateMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, percentage: event.target.value } : item
                            )
                          )
                        }
                        placeholder="%"
                        type="number"
                        min="0"
                        max="100"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.recycledContent}
                          onChange={(event) =>
                            setCreateMaterialEntries((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, recycledContent: event.target.checked } : item
                              )
                            )
                          }
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Recycled</span>
                      </div>
                      <input
                        value={entry.recycledPercentage}
                        onChange={(event) =>
                          setCreateMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, recycledPercentage: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Recycled %"
                        disabled={!entry.recycledContent}
                        type="number"
                        min="0"
                        max="100"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCreateMaterialEntries((current) =>
                            current.length === 1
                              ? [{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }]
                              : current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="rounded-xl bg-slate-100 dark:bg-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCreateMaterialEntries((current) => [...current, { materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }])
                  }
                  className="mt-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  + Add material
                </button>
              </label>
              <label className="sm:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                End of Life Instructions
                <textarea
                  value={createEndOfLifeInstructions}
                  onChange={(event) => setCreateEndOfLifeInstructions(event.target.value)}
                  placeholder="How to recycle or dispose of this product..."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">Extra Fields</p>
                <div className="mt-2 space-y-2">
                  {createSupplementEntries.map((entry, index) => (
                    <div key={`create-supp-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={entry.key}
                        onChange={(event) =>
                          setCreateSupplementEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, key: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Field name"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <input
                        value={entry.value}
                        onChange={(event) =>
                          setCreateSupplementEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, value: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Field value"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCreateSupplementEntries((current) =>
                            current.length === 1
                              ? [{ key: "", value: "" }]
                              : current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="rounded-xl bg-slate-100 dark:bg-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCreateSupplementEntries((current) => [...current, { key: "", value: "" }])
                  }
                  className="mt-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  + Add extra field
                </button>
              </div>
              <label className="text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
                Upload Product Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCreateImageFile(event.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
            {actionError ? <p className="mt-4 text-sm font-medium text-rose-600">{actionError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setActionError("");
                }}
                className="rounded-full bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProduct}
                disabled={creatingProduct}
                className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {creatingProduct ? "Creating..." : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProductId ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Update Product</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Edit the product information below. Changes are saved to the database.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Product Name
                <input
                  value={editDraft.productName}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, productName: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Variant Name
                <input
                  value={editDraft.variantName}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, variantName: event.target.value }))
                  }
                  placeholder="e.g. Size S, Blue"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                SKU
                <input
                  value={editDraft.sku}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="e.g. PRD-001-BLU"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-300">
                Organization
                <select
                  value={editDraft.organizationId}
                  onChange={(event) =>
                    setEditDraft((current) => ({ ...current, organizationId: event.target.value }))
                  }
                  className={SELECT}
                >
                  <option value="">Select organization</option>
                  {organizationOptions.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                Materials Composition
                <div className="mt-2 space-y-2">
                  {editMaterialEntries.map((entry, index) => (
                    <div key={`edit-mat-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_0.5fr_0.5fr_0.5fr_auto]">
                      <input
                        value={entry.materialName}
                        onChange={(event) =>
                          setEditMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, materialName: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Material name"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <input
                        value={entry.percentage}
                        onChange={(event) =>
                          setEditMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, percentage: event.target.value } : item
                            )
                          )
                        }
                        placeholder="%"
                        type="number"
                        min="0"
                        max="100"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={entry.recycledContent}
                          onChange={(event) =>
                            setEditMaterialEntries((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, recycledContent: event.target.checked } : item
                              )
                            )
                          }
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Recycled</span>
                      </div>
                      <input
                        value={entry.recycledPercentage}
                        onChange={(event) =>
                          setEditMaterialEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, recycledPercentage: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Recycled %"
                        disabled={!entry.recycledContent}
                        type="number"
                        min="0"
                        max="100"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500 disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditMaterialEntries((current) =>
                            current.length === 1
                              ? [{ materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }]
                              : current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="rounded-xl bg-slate-100 dark:bg-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditMaterialEntries((current) => [...current, { materialName: "", percentage: "", recycledContent: false, recycledPercentage: "" }])
                  }
                  className="mt-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  + Add material
                </button>
              </label>
              <label className="sm:col-span-2 text-sm text-slate-700 dark:text-slate-300">
                End of Life Instructions
                <textarea
                  value={editEndOfLifeInstructions}
                  onChange={(event) => setEditEndOfLifeInstructions(event.target.value)}
                  placeholder="How to recycle or dispose of this product..."
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-brand-500"
                />
              </label>
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-700 dark:text-slate-300">Extra Fields</p>
                <div className="mt-2 space-y-2">
                  {editSupplementEntries.map((entry, index) => (
                    <div key={`edit-supp-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={entry.key}
                        onChange={(event) =>
                          setEditSupplementEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, key: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Field name"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <input
                        value={entry.value}
                        onChange={(event) =>
                          setEditSupplementEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, value: event.target.value } : item
                            )
                          )
                        }
                        placeholder="Field value"
                        className="h-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditSupplementEntries((current) =>
                            current.length === 1
                              ? [{ key: "", value: "" }]
                              : current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        className="rounded-xl bg-slate-100 dark:bg-slate-600 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditSupplementEntries((current) => [...current, { key: "", value: "" }])
                  }
                  className="mt-2 rounded-full bg-slate-100 dark:bg-slate-600 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  + Add extra field
                </button>
              </div>
              <label className="text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
                Upload Product Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSelectedImageFile(event.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
            {actionError ? <p className="mt-4 text-sm font-medium text-rose-600">{actionError}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingProductId("");
                  setActionError("");
                }}
                className="rounded-full bg-slate-100 dark:bg-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(editingProductId)}
                disabled={savingEdit}
                className="rounded-full bg-gradient-to-r from-brand-600 to-brand-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteProduct ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06]">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Delete Product</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {pendingDeleteProduct.productName || pendingDeleteProduct.id}
              </span>
              ? This action cannot be undone.
            </p>

            {actionError ? <p className="mt-4 text-sm font-medium text-rose-600">{actionError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteProduct(null);
                  setActionError("");
                }}
                className="rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProduct(pendingDeleteProduct.id)}
                disabled={deletingProductId === pendingDeleteProduct.id}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {deletingProductId === pendingDeleteProduct.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/80 px-4 animate-fade-in" onClick={() => setQrModal(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-7 pt-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">QR Code</p>
                  <h2 className="mt-1 text-xl font-extrabold text-white leading-tight">{qrModal.productName || "Product"}</h2>
                  <p className="mt-0.5 text-xs text-emerald-100 font-mono opacity-80">{qrModal.id}</p>
                </div>
                <button type="button" onClick={() => setQrModal(null)} className="text-white/70 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-7">
              <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 ring-1 ring-slate-100 dark:ring-white/[0.06]">
                <img src={qrModal.qrUrl} alt="QR Code" className="w-44 h-44 object-contain" />
              </div>
              <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">Scan this code to access the product passport</p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(qrModal.qrUrl)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Copy URL
                </button>
                <a
                  href={qrModal.qrUrl}
                  download={`${qrModal.productName || qrModal.id}-qr.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 h-10 rounded-xl bg-emerald-600 text-sm font-semibold text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DPP Modal — full product passport */}
      {dppModal && (() => {
        const dppImg = uploadedImages[dppModal.id] || readProductImageUrl(dppModal);
        const suppEntries = Object.entries(dppModal.additionalInfo || dppModal.supplementalInfo || {}).filter(([k]) => k !== "imageUrl");
        return (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/60 dark:bg-black/80 px-4 py-6 animate-fade-in" onClick={() => setDppModal(null)}>
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06] overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Gradient header with product image */}
            <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-slate-800 px-8 pt-8 pb-7 shrink-0">
              {/* Close */}
              <button type="button" onClick={() => setDppModal(null)} className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex items-start gap-5">
                {/* Product image */}
                <div className="flex-none">
                  {dppImg ? (
                    <img src={dppImg} alt={dppModal.productName} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="h-20 w-20 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                  )}
                </div>

                {/* Title + id */}
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-200">Digital Product Passport</p>
                  <h2 className="mt-1 text-xl font-extrabold text-white leading-snug">{dppModal.productName || "Product"}</h2>
                  <p className="mt-0.5 text-[11px] text-brand-200 font-mono opacity-70 truncate">{dppModal.id}</p>
                  {dppModal.variantName && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
                      {dppModal.variantName}
                    </span>
                  )}
                </div>
              </div>

              {/* AI score pill */}
              {typeof dppModal.aiScore === "number" && (
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/15 ring-1 ring-white/20 flex flex-col items-center justify-center flex-none">
                    <span className="text-lg font-extrabold text-white leading-none">{Math.round(dppModal.aiScore)}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-brand-200">AI</span>
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${Math.min(dppModal.aiScore, 100)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white/70">{Math.round(dppModal.aiScore)}%</span>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">
              <div className="p-7 space-y-6">

                {/* Core attributes grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {[
                    { label: "Variant", value: dppModal.variantName },
                    { label: "SKU", value: dppModal.sku },
                    { label: "Organization", value: dppModal.organizationId },
                    { label: "Product ID", value: dppModal.id },
                  ].map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">{value}</p>
                    </div>
                  ) : null)}
                </div>

                {/* Materials Composition */}
                {Array.isArray(dppModal.materialsComposition) && dppModal.materialsComposition.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Materials</p>
                    <div className="grid grid-cols-2 gap-3">
                      {dppModal.materialsComposition.map((m, idx) => (
                        <div key={idx} className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-white/[0.06] px-3 py-2.5">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.materialName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.percentage}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra Fields */}
                {suppEntries.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Extra Fields</p>
                    <div className="grid grid-cols-2 gap-3">
                      {suppEntries.map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-white/[0.06] px-3 py-2.5">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{k}</p>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-words">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Passport URL */}
                {dppModal.dppUrl && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">Passport URL</p>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all">{dppModal.dppUrl}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pb-1">
                  {dppModal.dppUrl && (
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(dppModal.dppUrl)}
                      className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-700/50 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Copy URL
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setDppModal(null); navigate(`/passport/${dppModal.id}`); }}
                    className="flex-1 h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Open Passport
                  </button>
                  {dppModal.qrUrl && (
                    <button
                      type="button"
                      onClick={() => { setDppModal(null); setQrModal(dppModal); }}
                      className="h-11 w-11 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-brand-600 hover:border-brand-200 transition-colors"
                      title="View QR Code"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Import Products</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload a CSV file to create multiple products at once.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Organization
                <select
                  value={csvOrgId}
                  onChange={(e) => setCsvOrgId(e.target.value)}
                  className={SELECT}
                >
                  <option value="">Select organization</option>
                  {organizationOptions.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                CSV File
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvResult(null); setCsvError(""); }}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-slate-700"
                  />
                </div>
              </label>

              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/50 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Expected columns</p>
                <p><span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">productName</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">companyName</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">variantName</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">sku</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">endOfLifeInstructions</span></p>
                <p><span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">material_1_name</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">material_1_percentage</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">material_1_recycled_content</span> · <span className="font-mono bg-white rounded px-1 py-0.5 border border-slate-200">material_1_recycled_percentage</span></p>
                <p className="text-slate-400 italic">Any other column is stored as an extra field (e.g. countryOfOrigin, certification).</p>
              </div>

              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download example template
              </button>
            </div>

            {csvError && <p className="mt-4 text-sm font-medium text-rose-600">{csvError}</p>}

            {csvResult && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-700">
                  {csvResult.length} product{csvResult.length !== 1 ? "s" : ""} imported successfully
                </p>
                <ul className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
                  {csvResult.map((p) => (
                    <li key={p.id} className="text-xs text-emerald-600">
                      {p.productName}{p.sku ? ` — ${p.sku}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {csvResult ? "Close" : "Cancel"}
              </button>
              {!csvResult && (
                <button
                  type="button"
                  onClick={handleCsvImport}
                  disabled={csvImporting || !csvFile}
                  className="rounded-full bg-gradient-to-r from-slate-900 to-flax-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {csvImporting ? "Importing…" : "Import Products"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {sheetModalProduct && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 dark:bg-black/70 backdrop-blur-[2px] px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-2xl ring-1 ring-slate-900/10 dark:ring-white/[0.06]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Create Technical Sheet</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  For product: <span className="font-semibold text-slate-700 dark:text-slate-200">{sheetModalProduct.productName || sheetModalProduct.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSheetModalProduct(null); setActionError(""); }}
                className="ml-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Sheet Type</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: "MATERIAL_SHEET", label: "Material Sheet", desc: "Bill of materials & components", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
                    { type: "OPERATION_SHEET", label: "Operation Sheet", desc: "Production routing & steps", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSheetDraft((p) => ({ ...p, type: opt.type }))}
                      className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                        sheetDraft.type === opt.type
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500/20"
                          : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700/50 hover:border-slate-300"
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        sheetDraft.type === opt.type ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300" : "bg-slate-100 dark:bg-slate-700/50 text-slate-400"
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${sheetDraft.type === opt.type ? "text-brand-900 dark:text-brand-200" : "text-slate-700 dark:text-slate-200"}`}>{opt.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Sheet Name
                <input
                  value={sheetDraft.name}
                  onChange={(e) => setSheetDraft((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700/50 dark:text-slate-100 px-3 text-sm focus:border-brand-500 dark:focus:bg-slate-700 focus:ring-4 focus:ring-brand-500/10 outline-none"
                  placeholder="e.g. Lake Sunset — Material Sheet"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description (optional)
                <textarea
                  value={sheetDraft.description}
                  onChange={(e) => setSheetDraft((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-700/50 dark:text-slate-100 px-3 py-2 text-sm focus:border-brand-500 dark:focus:bg-slate-700 focus:ring-4 focus:ring-brand-500/10 outline-none resize-none"
                  placeholder="Brief description of this sheet..."
                />
              </label>
            </div>

            {actionError && <p className="mt-4 text-sm font-medium text-rose-600">{actionError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setSheetModalProduct(null); setActionError(""); }}
                className="rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSheet}
                disabled={creatingSheet || !sheetDraft.name.trim()}
                className="rounded-full bg-gradient-to-r from-slate-900 to-flax-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-70 flex items-center gap-2"
              >
                {creatingSheet ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  "Create Sheet"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ProductsPage;
