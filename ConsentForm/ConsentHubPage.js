// ConsentHubPage.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import ConsentFormSection from "./ConsentFormSection";
import "./ConsentHubPage.css";

export default function ConsentHubPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    const fetchHubData = async () => {
      if (!projectId) return;

      setLoadingProject(true);
      setProject(null);
      setAcceptedCount(0);

      try {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (!projectDoc.exists()) {
          console.error("Project not found:", projectId);
          return;
        }

        const projectData = { ...projectDoc.data(), id: projectDoc.id };
        setProject(projectData);

        const statusField = `projectResponses.${projectId}.status`;

        try {
          const qy = query(collection(db, "informants"), where(statusField, "==", "accepted"));
          const snap = await getDocs(qy);
          setAcceptedCount(snap.size);
        } catch (e) {
          console.warn("Accepted informants count query failed, fallback to filter-all:", e);
          const all = await getDocs(collection(db, "informants"));
          const filtered = all.docs.filter((d) => {
            const data = d.data();
            return data?.projectResponses?.[projectId]?.status === "accepted";
          });
          setAcceptedCount(filtered.length);
        }
      } catch (e) {
        console.error("Consent hub error:", e);
      } finally {
        setLoadingProject(false);
      }
    };

    fetchHubData();
  }, [projectId]);

  return (
    <div className="consent-hub-page">
      <div className="consent-hub-header">
        <div className="consent-hub-titleblock">
          <div className="consent-hub-title">Consent Hub</div>
          <div className="consent-hub-subtitle">
            Project: <b>{project?.name || project?.code || projectId}</b>
          </div>
          <div className="consent-hub-meta">
            {loadingProject ? (
              <span>Loading project…</span>
            ) : (
              <span>
                Accepted informants: <b>{acceptedCount}</b>
              </span>
            )}
          </div>
        </div>

        <div className="consent-hub-actions">
          <button
            className="ch-btn ch-btn-ghost"
            onClick={() => navigate(`/project/${projectId}/accepted-informants`)}
            title="Check Echo click status and send Ini file"
          >
            Accepted Informants
          </button>

          <button
            className="ch-btn ch-btn-ghost"
            onClick={() => navigate(`/project/${projectId}/informants`)}
          >
            Back to Informants
          </button>
        </div>
      </div>

      <div className="consent-hub-cards">
        <div className="ch-card ch-card-teal">
          <div className="ch-card-head">Create New Consent Form</div>
          <div className="ch-card-body">
            This consent form will be sent to all <b>{acceptedCount}</b> accepted informants in this project.
          </div>
          <div className="ch-card-foot">
            <button
              className="ch-btn ch-btn-teal"
              onClick={() => navigate(`/project/${projectId}/consent-form-builder`)}
              disabled={loadingProject}
              title={loadingProject ? "Loading project…" : "Open consent form builder"}
            >
              Create Consent Form
            </button>
          </div>
        </div>

        <div className="ch-card ch-card-orange">
          <div className="ch-card-head">Upload PDF Consent Form</div>
          <div className="ch-card-body">
            Upload a PDF consent form to be signed by all <b>{acceptedCount}</b> accepted informants.
          </div>
          <div className="ch-card-foot">
            <button
              className="ch-btn ch-btn-orange"
              onClick={() => navigate(`/project/${projectId}/pdf-consent-upload`)}
              disabled={loadingProject}
              title={loadingProject ? "Loading project…" : "Upload a PDF consent form"}
            >
              Upload PDF Consent Form
            </button>
          </div>
        </div>
      </div>

      <div className="consent-hub-tablewrap">
        <ConsentFormSection
          informants={Array.from({ length: acceptedCount })}
          project={project}
          db={db}
        />
      </div>
    </div>
  );
}