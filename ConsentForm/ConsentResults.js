import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc 
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './ConsentResults.css';

const ConsentResults = () => {
  // Get formId from URL parameters
  const { formId } = useParams();
  console.log('=== Component Initialization ===');
  console.log('URL Parameters:', useParams());
  console.log('Form ID from URL:', formId);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consentForm, setConsentForm] = useState(null);
  const [informants, setInformants] = useState([]);
  const [formType, setFormType] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      console.log('=== Starting fetchResults ===');
      console.log('Attempting to fetch results for formId:', formId);
      
      if (!formId) {
        console.error('No formId provided in URL');
        setError('No form ID provided');
        setLoading(false);
        return;
      }

      try {
        // 1. First try to get the consent form data from customConsents
        console.log('Fetching consent form from customConsents:', formId);
        let formDoc = await getDoc(doc(db, 'customConsents', formId));
        let currentFormType = 'custom';

        if (!formDoc.exists()) {
          // If not found in customConsents, try pdfConsents
          console.log('Form not found in customConsents, trying pdfConsents:', formId);
          formDoc = await getDoc(doc(db, 'pdfConsents', formId));
          currentFormType = 'pdf';

          if (!formDoc.exists()) {
            console.error('Form document not found in either collection:', formId);
            throw new Error('Consent form not found');
          }
        }

        setFormType(currentFormType);
        const formData = formDoc.data();
        console.log('Retrieved form data:', formData);
        console.log('Form type:', currentFormType);
        setConsentForm(formData);

        // 2. Initialize informants array based on form type
        console.log('Processing informants from form data');
        let rawInformants = [];
        
        // 2) Build expected informants list from PROJECT accepted informants
        console.log("Building informants list from accepted informants for project:", formData.projectId);

        let acceptedNicknameList = [];

        if (formData.projectId) {
          const pid = formData.projectId;
          const statusField = `projectResponses.${pid}.status`;

          try {
            const qy = query(collection(db, "informants"), where(statusField, "==", "accepted"));
            const snap = await getDocs(qy);

            acceptedNicknameList = snap.docs
              .map((d) => {
                const data = d.data();
                return (data.nickname || data.fullName || data.email || d.id || "").toString().trim();
              })
              .filter(Boolean);
          } catch (e) {
            console.warn("Accepted informants query failed, fallback to filter-all:", e);

            const all = await getDocs(collection(db, "informants"));
            acceptedNicknameList = all.docs
              .filter((d) => d.data()?.projectResponses?.[pid]?.status === "accepted")
              .map((d) => {
                const data = d.data();
                return (data.nickname || data.fullName || data.email || d.id || "").toString().trim();
              })
              .filter(Boolean);
          }
        }

        // Fallback: if no projectId or query yielded nothing, use informants saved on form
        if (acceptedNicknameList.length === 0) {
          acceptedNicknameList = (formData.informants || formData.team || [])
            .map((inf) =>
              typeof inf === "object" && inf !== null
                ? (inf.nickname || inf.name || inf.id || "")
                : (inf || "")
            )
            .map((x) => x.toString().trim())
            .filter(Boolean);
        }

        console.log("Accepted nickname list:", acceptedNicknameList);
        
        // 3. Query consent results for BOTH custom and PDF forms
        console.log('Querying consentResults collection');
        const resultsQuery = query(
          collection(db, 'consentResults'),
          where('formId', '==', formId)
        );

        const resultsSnapshot = await getDocs(resultsQuery);
        console.log('Results query response:', {
          size: resultsSnapshot.size,
          empty: resultsSnapshot.empty
        });

        // If we still don't have results, check if there are any results with the formId in a different field
        let finalResultsSnapshot = resultsSnapshot;
        
        if (resultsSnapshot.empty && currentFormType === 'pdf') {
          // For PDF consents, sometimes the formId might be stored differently
          console.log('No results found with direct formId match, trying alternative queries for PDF forms');
          
          // Try querying using lowercase formId (in case of case sensitivity issues)
          const altResultsQuery = query(
            collection(db, 'consentResults'),
            where('formId', '==', formId.toLowerCase())
          );
          
          const altResultsSnapshot = await getDocs(altResultsQuery);
          
          if (!altResultsSnapshot.empty) {
            console.log('Found results with lowercase formId match');
            finalResultsSnapshot = altResultsSnapshot;
          } else {
            // If still no results, try matching against other fields that might contain the formId
            console.log('Trying to fetch all results and filter manually');
            const allResultsQuery = query(collection(db, 'consentResults'));
            const allResultsSnapshot = await getDocs(allResultsQuery);
            
            // Filter manually to find any document that might contain our formId
            const matchingDocs = allResultsSnapshot.docs.filter(doc => {
              const data = doc.data();
              // Check common fields that might contain the formId
              return (
                data.formId === formId ||
                data.pdfFormId === formId ||
                data.consentFormId === formId
              );
            });
            
            if (matchingDocs.length > 0) {
              console.log('Found results with alternative field matches:', matchingDocs.length);
              finalResultsSnapshot = { 
                docs: matchingDocs,
                size: matchingDocs.length,
                empty: false
              };
            }
          }
        }

        // Process the results data
        const resultsData = finalResultsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Result document:', { id: doc.id, data });
          return {
            id: doc.id,
            ...data
          };
        });

        console.log('Processed results data:', resultsData);
        setResults(resultsData);

        const resultInformants = resultsData
          .map((r) => (r.nickname || "").toString().trim())
          .filter(Boolean);

        const allInformants = Array.from(new Set([...acceptedNicknameList, ...resultInformants]));
        console.log("Combined informants list:", allInformants);

        setInformants(allInformants);

      } catch (error) {
        console.error('Error in fetchResults:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [formId]);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="cr-page">
        <div className="cr-center">
          <div className="cr-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="cr-page">
        <div className="cr-messageWrap">
          <div className="cr-messageCard cr-messageCard-error">{error}</div>
        </div>
      </div>
    );
  }

  if (results.length === 0 && informants.length === 0) {
    return (
      <div className="cr-page">
        <div className="cr-messageWrap">
          <div className="cr-messageCard cr-messageCard-warn">
            No results found for this consent form.
          </div>
        </div>
      </div>
    );
  }

  // Debug table rendering
  console.log('=== Preparing Table Render ===');
  console.log('Number of informants to render:', informants.length);
  console.log('Number of results to match:', results.length);

  return (
    <div className="cr-page">
      <div className="cr-header">
        <div className="cr-titleblock">
          <div className="cr-title">Consent Results</div>
          <div className="cr-subtitle">
            Form: <b>{consentForm?.title || formId}</b>
          </div>
          <div className="cr-meta">
            Type: <b>{formType === "pdf" ? "PDF Consent" : "Custom Consent"}</b> ·
            Expected: <b>{informants.length}</b> ·
            Completed: <b>{results.length}</b>
          </div>
        </div>

        <div className="cr-actions">
          {/* Optional buttons if you want navigation like other pages */}
          {/* <button className="cr-btn cr-btn-ghost" onClick={() => window.history.back()}>Back</button> */}
        </div>
      </div>

      <div className="cr-panel">
        <div className="cr-panelHead">
          <div className="cr-panelHeadTop">
            <div className="cr-panelTitle">Results Table</div>
            <div className="cr-panelType">{formType === "pdf" ? "PDF Consent" : "Custom Consent"}</div>
          </div>
        </div>

        <div className="cr-tableWrap">
          <table className="cr-table">
            <thead className="cr-thead">
              <tr>
                <th>Informant</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Responses</th>
              </tr>
            </thead>

            <tbody className="cr-tbody">
              {informants.map((member) => {
                const norm = (s) => (s || "").toString().trim().toLowerCase();
                const memberResult = results.find((r) => norm(r.nickname) === norm(member));

                return (
                  <tr key={member} className="cr-row">
                    <td>
                      <div className="cr-name">{member}</div>
                    </td>

                    <td>
                      <span className={`cr-pill ${memberResult ? "cr-pill-ok" : "cr-pill-warn"}`}>
                        {memberResult ? "Completed" : "Pending"}
                      </span>
                    </td>

                    <td className="cr-muted">
                      {memberResult?.timestamp && typeof memberResult.timestamp.toDate === "function"
                        ? memberResult.timestamp.toDate().toLocaleString()
                        : memberResult?.timestamp || "-"}
                    </td>

                    <td className="cr-muted">
                      {memberResult ? (
                        <div className="cr-responses">
                          {Object.entries(memberResult.answers || {}).map(([key, value]) => (
                            <div key={key} className="cr-responseLine">
                              <span className="cr-responseKey">{key}:</span> {value.toString()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsentResults;