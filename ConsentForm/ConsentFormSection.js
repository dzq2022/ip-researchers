// ConsentFormSection.js
import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { AlertCircle } from "lucide-react";
import "./ConsentFormSection.css";

export default function ConsentFormSection({ informants = [], project, db }) {
  const navigate = useNavigate();

  const [consentForms, setConsentForms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDeleteConsent = async (formId, formType) => {
    if (!window.confirm("Are you sure you want to delete this consent form? This action cannot be undone.")) {
      return;
    }

    try {
      setError(null);

      const collectionName = formType === "PDF" ? "pdfConsents" : "customConsents";
      await deleteDoc(doc(db, collectionName, formId));

      const resultsQuery = query(collection(db, "consentResults"), where("formId", "==", formId));
      const resultsSnapshot = await getDocs(resultsQuery);

      for (const r of resultsSnapshot.docs) {
        await deleteDoc(doc(db, "consentResults", r.id));
      }

      setConsentForms((prev) => prev.filter((f) => f.id !== formId));
      alert("Consent form deleted successfully!");
    } catch (e) {
      console.error("Error deleting consent form:", e);
      setError("Failed to delete consent form. Please try again.");
    }
  };

  const fetchConsentForms = useCallback(async () => {
    if (!project?.id) {
      setLoading(false);
      setConsentForms([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const forms = [];

      const customFormsQuery = query(collection(db, "customConsents"), where("projectId", "==", project.id));
      const customFormsSnapshot = await getDocs(customFormsQuery);
      customFormsSnapshot.docs.forEach((d) => {
        forms.push({
          id: d.id,
          type: "Custom",
          ...d.data(),
        });
      });

      const pdfFormsQuery = query(collection(db, "pdfConsents"), where("projectId", "==", project.id));
      const pdfFormsSnapshot = await getDocs(pdfFormsQuery);
      pdfFormsSnapshot.docs.forEach((d) => {
        const data = d.data();
        forms.push({
          id: d.id,
          type: "PDF",
          title: data.fileName || "PDF Consent Form",
          createdAt: data.createdAt,
          ...data,
        });
      });

      const enriched = await Promise.all(
        forms.map(async (form) => {
          const resultsQuery = query(
            collection(db, "consentResults"),
            where("formId", "==", form.id),
            where("agreed", "==", true)
          );
          const resultsSnapshot = await getDocs(resultsQuery);

          const responseCount = resultsSnapshot.size;
          const totalCount = informants.length;

          let status = "Pending";
          if (totalCount > 0 && responseCount === totalCount) status = "Completed";
          else if (responseCount > 0) status = "In Progress";

          let createdDate = "N/A";
          if (form.createdAt) {
            if (form.createdAt.toDate && typeof form.createdAt.toDate === "function") {
              createdDate = form.createdAt.toDate().toLocaleDateString();
            } else if (!Number.isNaN(new Date(form.createdAt).getTime())) {
              createdDate = new Date(form.createdAt).toLocaleDateString();
            } else if (typeof form.createdAt === "number") {
              const ts = form.createdAt > 100000000000 ? form.createdAt : form.createdAt * 1000;
              createdDate = new Date(ts).toLocaleDateString();
            }
          }

          return {
            ...form,
            status,
            responseCount,
            totalCount,
            createdDate,
          };
        })
      );

      setConsentForms(enriched);
    } catch (e) {
      console.error("Error fetching consent forms:", e);
      setError("Failed to load consent forms. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [project?.id, informants.length, db]);

  useEffect(() => {
    fetchConsentForms();
  }, [fetchConsentForms]);

  if (!project?.id) {
    return (
      <div className="consent-section">
        <div className="cfs-empty">
          <AlertCircle size={18} />
          <span>Project information is not available yet.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="consent-section">
        <div className="cfs-loading">
          <div className="cfs-spinner" />
          <div className="cfs-loadingText">Loading consent forms…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-section">
        <div className="error-message">
          <AlertCircle size={20} color="#FF0000" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-section">
      <div className="forms-pool">
        <div className="forms-pool-header">
          <h3>Project Consent Forms</h3>
        </div>

        <div className="table-container">
          <table className="forms-table">
            <thead>
              <tr>
                <th>Form Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {consentForms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="cfs-noRows">
                    No consent forms yet.
                  </td>
                </tr>
              ) : (
                consentForms.map((form) => (
                  <tr key={form.id}>
                    <td>{form.title || "Untitled"}</td>
                    <td>{form.type}</td>
                    <td>
                      <span className={`status-indicator status-${form.status.toLowerCase().replace(/\s/g, "-")}`}>
                        {form.status} ({form.responseCount}/{form.totalCount})
                      </span>
                    </td>
                    <td>{form.createdDate}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/consent-results/${form.id}`)}
                        className="btn btn-link"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => handleDeleteConsent(form.id, form.type)}
                        className="btn btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footer-note">
        <AlertCircle size={16} />
        <span>All informants must complete the consent form before participating in any studies</span>
      </div>
    </div>
  );
}