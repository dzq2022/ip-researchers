// ExistingConsentForms.js
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './ExistingConsentForms.css'; 

const ExistingConsentForms = ({ projectEmail, onSelectForm }) => {
  const [customForms, setCustomForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForms = async () => {
      setError(null);
      try {
        // Fetch custom consent forms
        const ipEmail = localStorage.getItem('loggedInIpEmail');
        const emailToUse = projectEmail || ipEmail;
        
        const formsQuery = query(
          collection(db, 'customConsents'),
          where('createdBy', '==', emailToUse)
        );
        
        const querySnapshot = await getDocs(formsQuery);

        if (!querySnapshot.empty) {
          const formsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            formName: doc.data().title || doc.data().formName,
            sections: doc.data().sections || [],
            metadata: doc.data().metadata || {},
            createdAt: doc.data().createdAt || new Date().toISOString(),
            projectCode: doc.data().projectCode
          }));

          formsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setCustomForms(formsList);
        }
      } catch (error) {
        console.error('Error fetching consent forms:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [projectEmail]);

  const handleDeleteForm = async (formId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this consent form? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'customConsents', formId));
        setCustomForms(prevForms => prevForms.filter(f => f.id !== formId));
      } catch (error) {
        console.error('Error deleting consent form:', error);
        alert('Failed to delete consent form. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="survey-loading">Loading existing consent forms...</div>;
  }

  if (error || !customForms.length) {
    return null;
  }

  return (
    <div className="survey-name-section">
      <h3 className="previous-surveys-title">Previous Consent Forms</h3>
      <div className="surveys-list">
        {customForms.map(form => (
          <div 
            key={form.id}
            onClick={() => onSelectForm(form)}
            className="survey-item custom-survey"
          >
            <div className="survey-content">
              <div className="survey-info-row">
                <h3 className="survey-name">{form.formName}</h3>
                <span className="survey-date">
                  {new Date(form.createdAt).toLocaleString()}
                </span>
                <button
                  className="delete-survey-button"
                  onClick={(e) => handleDeleteForm(form.id, e)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExistingConsentForms;