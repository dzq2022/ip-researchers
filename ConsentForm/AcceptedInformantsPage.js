import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { sendIniDelivery } from "./iniDeliveryService";
import "./AcceptedInformantsPage.css";

export default function AcceptedInformantsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [acceptedInformants, setAcceptedInformants] = useState([]);
  const [loading, setLoading] = useState(true);

  const title = useMemo(() => "Accepted Informants", []);

  const sendWelcomeEmail = async (informant) => {
    try {
      if (!informant?.email) {
        alert("No email for this informant.");
        return;
      }

      await sendIniDelivery({ projectId, informant });

      alert(`INI link email sent to ${informant.email}.`);
    } catch (e) {
      console.error(e);
      alert("Failed to send INI email. Check Firebase Functions logs.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true);

      try {
        // 1) project
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (!projectDoc.exists()) {
          console.error("Project not found");
          setProject(null);
          setAcceptedInformants([]);
          return;
        }
        setProject({ ...projectDoc.data(), id: projectDoc.id });

        // 2) accepted informants (PROJECT-SPECIFIC)
        const statusField = `projectResponses.${projectId}.status`;

        let snap;
        try {
          const qy = query(collection(db, "informants"), where(statusField, "==", "accepted"));
          snap = await getDocs(qy);
        } catch (e) {
          console.warn("Accepted informants query fallback:", e);
          const all = await getDocs(collection(db, "informants"));
          const filteredDocs = all.docs.filter((d) => {
            const data = d.data();
            return data?.projectResponses?.[projectId]?.status === "accepted";
          });
          snap = { docs: filteredDocs };
        }

        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => {
          const aKey = (a.nickname || a.fullName || a.email || a.id || "").toString().toLowerCase();
          const bKey = (b.nickname || b.fullName || b.email || b.id || "").toString().toLowerCase();
          return aKey.localeCompare(bKey);
        });

        setAcceptedInformants(rows);
      } catch (error) {
        console.error("Error fetching data:", error);
        setAcceptedInformants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  return (
    <div className="ai-page">
      <div className="ai-header">
        <div className="ai-titleblock">
          <div className="ai-title">{title}</div>
          <div className="ai-subtitle">
            Project: <b>{project?.name || project?.code || projectId}</b>
          </div>
        </div>

        <div className="ai-headerActions">
          <button onClick={() => navigate(`/project/${projectId}/informants`)} className="ai-btn ai-btn-ghost">
            Back to Informants
          </button>

          <button onClick={() => navigate(`/project/${projectId}/consent-forms`)} className="ai-btn ai-btn-ghost">
            Back to Consent Hub
          </button>
        </div>
      </div>

      <div className="ai-panel">
        <div className="ai-panelHeader">Accepted Informants ({acceptedInformants.length})</div>

        {loading ? (
          <div className="ai-empty">Loading…</div>
        ) : acceptedInformants.length === 0 ? (
          <div className="ai-empty">No accepted informants found</div>
        ) : (
          <div className="ai-list">
            {acceptedInformants.map((informant) => {
              const echoClicked = !!(informant?.echo && informant?.echo?.downloadClickedAt);

              return (
                <div key={informant.id} className="ai-item">
                  <div className="ai-itemMain">
                    <div className="ai-name">
                      {informant.nickname || informant.fullName || informant.email || informant.id}
                    </div>
                    <div className="ai-meta">
                      {informant.email ? `Email: ${informant.email}` : null}
                      {informant.systemUsed ? ` · System: ${informant.systemUsed}` : null}
                    </div>
                  </div>

                  <div className="ai-actions">
                    <button
                      className={`ai-actionBtn ${echoClicked ? "ai-actionBtn-echoYes" : "ai-actionBtn-echoNo"}`}
                      disabled
                      title={echoClicked ? "Echo link clicked" : "Echo not clicked yet"}
                    >
                      Echo: {echoClicked ? "Yes" : "No"}
                    </button>

                    <button
                      className={`ai-actionBtn ai-actionBtn-ini ${echoClicked ? "" : "ai-actionBtn-disabled"}`}
                      onClick={() => sendWelcomeEmail(informant)}
                      disabled={!echoClicked || !informant?.email}
                      title={!echoClicked ? "Enable after Echo link is clicked" : "Send Ini email"}
                    >
                      Send Ini
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}