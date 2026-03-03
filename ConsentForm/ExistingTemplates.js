import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const ExistingTemplates = ({ projectEmail, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const ipEmail = localStorage.getItem('loggedInIpEmail');
        const emailToUse = projectEmail || ipEmail;
        
        const templatesQuery = query(
          collection(db, 'consentForms'),
          where('createdBy', '==', emailToUse)
        );
        
        const querySnapshot = await getDocs(templatesQuery);
        const templatesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        templatesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTemplates(templatesList);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [projectEmail]);

  if (loading) {
    return <div className="text-center py-4">Loading templates...</div>;
  }

  if (!templates.length) {
    return null;
  }

  return (
    <div className="existing-templates mt-8 bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4">Previous Templates</h3>
      <div className="grid gap-4">
        {templates.map(template => (
          <div 
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <h4 className="font-medium">{template.title}</h4>
            <div className="text-sm text-gray-500 mt-1">
              Created: {new Date(template.createdAt).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-500">
              Language: {template.metadata.language}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExistingTemplates;