import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { consentTemplates } from './ConsentTemplates';
import { db } from '../../firebaseConfig';
import { 
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import ExistingConsentForms from './ExistingConsentForms';
import './ConsentFormBuilder.css';

const ALLOW_CUSTOM_AFTER = ['purpose', 'procedures', 'risks'];

const defaultSections = Object.entries(consentTemplates).map(([id, template]) => ({
  id,
  title: template.title,
  content: template.content,
  required: true,
}));

const ConsentFormBuilder = () => {
  const { projectId } = useParams(); // Changed to use projectId from URL
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    metadata: {
      version: '1.0',
      language: 'English',
      irbNumber: '',
      approvalDate: '',
      expirationDate: ''
    },
    sections: defaultSections
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptedInformants, setAcceptedInformants] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        console.error('No project ID found in URL');
        setError('Project ID is missing');
        return;
      }
      
      setLoading(true);
      setError(null);

      try {
        // Get project data
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) {
          throw new Error('Project not found');
        }

        const projectData = {
          ...projectDoc.data(),
          id: projectDoc.id
        };
        setProject(projectData);

        // Fetch accepted informants for this project
        const informantsRef = collection(db, 'informants');
        const informantsQuery = query(
          informantsRef,
          where('status', '==', 'accepted')
        );
        
        const informantsSnapshot = await getDocs(informantsQuery);
        const acceptedList = [];

        informantsSnapshot.forEach(doc => {
          const informantData = doc.data();
          if (informantData.projectResponses && 
              informantData.projectResponses[projectId]) {
            acceptedList.push({
              id: doc.id,
              ...informantData
            });
          }
        });

        setAcceptedInformants(acceptedList);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load project data: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleMetadataChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  const handleSectionChange = (sectionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    }));
  };

  const moveSection = (sectionId, direction) => {
    setFormData(prev => {
      const sections = [...prev.sections];
      const currentIndex = sections.findIndex(s => s.id === sectionId);
      
      if (currentIndex === -1) return prev;
      if (direction === 'up' && currentIndex === 0) return prev;
      if (direction === 'down' && currentIndex === sections.length - 1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [sections[currentIndex], sections[newIndex]] = [sections[newIndex], sections[currentIndex]];
      
      return {
        ...prev,
        sections
      };
    });
  };

  const addCustomSection = (afterSectionId) => {
    const newSection = {
      id: `custom_${Date.now()}`,
      title: 'New Section',
      content: '',
      required: false,
    };

    setFormData(prev => {
      const sectionIndex = prev.sections.findIndex(s => s.id === afterSectionId);
      if (sectionIndex === -1) return prev;

      const newSections = [...prev.sections];
      newSections.splice(sectionIndex + 1, 0, newSection);
      
      return {
        ...prev,
        sections: newSections
      };
    });
  };

  const removeSection = (sectionId) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };


  const saveForm = async () => {
    if (!formData.title.trim()) {
      setError('Please enter a form title');
      return;
    }

    if (!projectId) {
      setError('No project information available');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build a clean object without spreading the entire formData
      const formDataToSave = {
        // Include only what we need from formData
        title: formData.title,
        metadata: {
          version: formData.metadata.version || '1.0',
          language: formData.metadata.language || 'English',
          irbNumber: formData.metadata.irbNumber || '',
          approvalDate: formData.metadata.approvalDate || '',
          expirationDate: formData.metadata.expirationDate || ''
        },
        sections: formData.sections.map(section => ({
          id: section.id,
          title: section.title || '',
          content: section.content || '',
          required: !!section.required
        })),
        // Add other required fields
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: project?.email || localStorage.getItem('loggedInIpEmail') || 'unknown',
        informants: acceptedInformants.map(inf => ({
          id: inf.id,
          nickname: inf.nickname || 'Anonymous'
        }))
      };

      // Log the data for debugging
      console.log('Saving form data:', formDataToSave);

      // Add to customConsents collection
      await addDoc(collection(db, 'customConsents'), formDataToSave);

      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 2000);
      
      // Navigate back to project management
      navigate(`/project/${projectId}/consent-forms`);
    } catch (error) {
      console.error('Error saving consent form:', error);
      setError('Failed to save form: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="form-loading">Loading consent form...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="consent-form-builder">
      <div className="form-header">
        <h2>Informed Consent Form Builder</h2>
        <div className="header-actions">
          <button onClick={() => setShowPreview(true)} className="preview-button">
            Preview Form
          </button>
          <button onClick={() => navigate(`/project/${projectId}/consent-forms`)} className="back-button">
            Back to Consent Hub
          </button>
        </div>
      </div>

      {project?.email && (
        <ExistingConsentForms 
          projectEmail={project.email}
          onSelectForm={(form) => setFormData(form)}
        />
      )}

      <div className="form-metadata">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter form title"
          className="form-title-input"
        />
        
        <div className="metadata-grid">
          <div className="metadata-item">
            <label>IRB Number</label>
            <input
              type="text"
              value={formData.metadata.irbNumber}
              onChange={(e) => handleMetadataChange('irbNumber', e.target.value)}
            />
          </div>
          <div className="metadata-item">
            <label>Version</label>
            <input
              type="text"
              value={formData.metadata.version}
              onChange={(e) => handleMetadataChange('version', e.target.value)}
            />
          </div>
          <div className="metadata-item">
            <label>Language</label>
            <select
              value={formData.metadata.language}
              onChange={(e) => handleMetadataChange('language', e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Chinese">Chinese</option>
            </select>
          </div>
          <div className="metadata-item">
            <label>Approval Date</label>
            <input
              type="date"
              value={formData.metadata.approvalDate}
              onChange={(e) => handleMetadataChange('approvalDate', e.target.value)}
            />
          </div>
          <div className="metadata-item">
            <label>Expiration Date</label>
            <input
              type="date"
              value={formData.metadata.expirationDate}
              onChange={(e) => handleMetadataChange('expirationDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-sections">
        {formData.sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div className="form-section">
              <div className="section-header">
                <div className="section-title-container">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                    className="section-title"
                  />
                </div>
                <div className="section-actions">
                  <button 
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={index === 0}
                    className="move-button"
                  >
                    ↑
                  </button>
                  <button 
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={index === formData.sections.length - 1}
                    className="move-button"
                  >
                    ↓
                  </button>
                  <button 
                    onClick={() => removeSection(section.id)}
                    className="remove-section"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <textarea
                value={section.content}
                onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
                placeholder="Enter section content..."
                className="section-content"
              />
            </div>
            
            {ALLOW_CUSTOM_AFTER.includes(section.id) && (
              <button 
                onClick={() => addCustomSection(section.id)} 
                className="add-section"
              >
                + Add Custom Section
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      {showPreview && (
        <div className="preview-overlay">
          <div className="preview-content">
            <h2>{formData.title || 'Untitled Form'}</h2>
            <div className="preview-metadata">
              <p>IRB #: {formData.metadata.irbNumber}</p>
              <p>Version: {formData.metadata.version}</p>
              <p>Approval Date: {formData.metadata.approvalDate}</p>
              <p>Expiration Date: {formData.metadata.expirationDate}</p>
              <p>Language: {formData.metadata.language}</p>
            </div>
            {formData.sections.map((section) => (
              <div key={section.id} className="preview-section">
                <h3>{section.title}</h3>
                <p>{section.content}</p>
              </div>
            ))}
            <div className="preview-actions">
              <button onClick={() => setShowPreview(false)}>Close Preview</button>
              <button onClick={() => window.print()} className="print-button">
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button 
          onClick={saveForm}
          disabled={saving}
          className={`save-button ${saving ? 'saving' : ''} ${savedSuccessfully ? 'saved' : ''}`}
        >
          {saving ? 'Saving...' : savedSuccessfully ? 'Saved!' : 'Save Form'}
        </button>
      </div>
    </div>
  );
};

export default ConsentFormBuilder;