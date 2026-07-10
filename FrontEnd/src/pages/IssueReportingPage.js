import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { getMyOperations, createEmployeeIssue, getMyIssues } from "../services/authService";
import { AlertTriangle, Bug, Wrench, ShieldAlert, AlertCircle, MessageSquare, Plus, X, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

const CARD = "bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/[0.06] p-5";

const ISSUE_TYPES = [
  { value: "MATERIAL_SHORTAGE", icon: Bug, label: "Material Missing" },
  { value: "MACHINE_BREAKDOWN", icon: Wrench, label: "Machine Breakdown" },
  { value: "QUALITY_ISSUE", icon: ShieldAlert, label: "Quality Problem" },
  { value: "WAITING_APPROVAL", icon: Clock, label: "Waiting For Approval" },
  { value: "EMPLOYEE_ABSENT", icon: AlertCircle, label: "Employee Absent" },
  { value: "OTHER", icon: MessageSquare, label: "Other" },
];

const RESOLVED_STYLES = {
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function getIssueTypeConfig(value) {
  return ISSUE_TYPES.find((t) => t.value === value) || ISSUE_TYPES[ISSUE_TYPES.length - 1];
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IssueReportingPage() {
  const [activeTab, setActiveTab] = useState("report");

  const [steps, setSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [stepsError, setStepsError] = useState("");

  const [stepId, setStepId] = useState("");
  const [issueType, setIssueType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issuesError, setIssuesError] = useState("");
  const [expandedIssueIds, setExpandedIssueIds] = useState(new Set());

  const loadSteps = async () => {
    setLoadingSteps(true);
    setStepsError("");
    try {
      const data = await getMyOperations();
      const filtered = (data || []).filter((s) => s.status !== "COMPLETED");
      setSteps(filtered);
    } catch (e) {
      setStepsError(e.message || "Failed to load steps.");
    } finally {
      setLoadingSteps(false);
    }
  };

  const loadIssues = async () => {
    setLoadingIssues(true);
    setIssuesError("");
    try {
      const data = await getMyIssues();
      const sorted = (data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setIssues(sorted);
    } catch (e) {
      setIssuesError(e.message || "Failed to load issues.");
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    loadSteps();
  }, []);

  useEffect(() => {
    if (activeTab === "my-issues") {
      loadIssues();
    }
  }, [activeTab]);

  const resetForm = () => {
    setStepId("");
    setIssueType("");
    setTitle("");
    setDescription("");
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stepId || !issueType || !title.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      await createEmployeeIssue({
        stepId,
        issueType,
        title: title.trim(),
        description: description.trim(),
      });
      setSubmitSuccess(true);
      resetForm();
    } catch (err) {
      setSubmitError(err.message || "Failed to submit issue.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleIssueExpand = (id) => {
    setExpandedIssueIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabs = [
    { key: "report", label: "Report Issue" },
    { key: "my-issues", label: "My Issues" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">
            Employee Portal
          </p>
          <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Issue Reporting
          </h1>
        </div>

        <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "report" && (
          <form onSubmit={handleSubmit} className={`${CARD} space-y-5`}>
            {stepsError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                <AlertTriangle size={16} />
                {stepsError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Step <span className="text-red-400">*</span>
              </label>
              {loadingSteps ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                  Loading steps...
                </div>
              ) : (
                <select
                  value={stepId}
                  onChange={(e) => setStepId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 appearance-none"
                >
                  <option value="">Select a step...</option>
                  {steps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.operationName} — {s.productName || "No product"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Issue Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {ISSUE_TYPES.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIssueType(value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                      issueType === value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 ring-1 ring-brand-500/30"
                        : "border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/[0.12]"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for the issue"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1E293B] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                <AlertTriangle size={16} />
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl">
                <CheckCircle size={16} />
                Issue reported successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !stepId || !issueType || !title.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-semibold transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <AlertTriangle size={16} />
              )}
              {submitting ? "Submitting..." : "Report Issue"}
            </button>
          </form>
        )}

        {activeTab === "my-issues" && (
          <div className="space-y-4">
            {loadingIssues ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            ) : issuesError ? (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                <AlertTriangle size={16} />
                {issuesError}
              </div>
            ) : issues.length === 0 ? (
              <div className={`${CARD} text-center py-16`}>
                <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="font-semibold text-slate-500 dark:text-slate-400">No issues reported</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Your reported issues will appear here.
                </p>
              </div>
            ) : (
              issues.map((issue) => {
                const cfg = getIssueTypeConfig(issue.issueType);
                const Icon = cfg.icon;
                const isExpanded = expandedIssueIds.has(issue.id);
                const resolved = issue.resolved;

                return (
                  <div key={issue.id} className={`${CARD} space-y-3 animate-fade-in`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          resolved
                            ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {issue.title}
                          </p>
                          <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            resolved
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {resolved ? "Resolved" : "Open"}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2">
                      {issue.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{formatDate(issue.createdAt)}</span>
                      {issue.operationName && (
                        <span className="inline-flex items-center gap-1">
                          {issue.operationName}
                        </span>
                      )}
                    </div>

                    {resolved && issue.resolvedByName && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle size={12} />
                        Resolved by {issue.resolvedByName}
                        {issue.resolvedAt && <> · {formatDate(issue.resolvedAt)}</>}
                      </div>
                    )}

                    {issue.description && issue.description.length > 100 && (
                      <button
                        onClick={() => toggleIssueExpand(issue.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={14} /> Show less</>
                        ) : (
                          <><ChevronDown size={14} /> Show more</>
                        )}
                      </button>
                    )}

                    {isExpanded && issue.description && issue.description.length > 100 && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {issue.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
