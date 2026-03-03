// ConsentTemplates.js
import React from 'react';

export const consentTemplates = {
  purpose: {
    title: 'Purpose of the Study',
    content: `This research study aims to [specific research objective]. The primary goals are:

1. To investigate [specific aspect or phenomenon]
2. To understand [specific relationship or pattern]
3. To develop/evaluate [specific method or approach]

Your participation will contribute to our understanding of [broader impact or benefit]. This study is being conducted as part of [context: e.g., doctoral research, institutional initiative] at [institution name].

The findings from this research will:
• Advance our knowledge of [specific field/area]
• Help develop better [methods/practices/understanding]
• Potentially benefit [specific group or community]`
  },
  procedures: {
    title: 'Research Procedures',
    content: `If you agree to participate in this study, you will be asked to:

1. Complete [specific task/activity]
   • Duration: [approximate time]
   • Format: [online/in-person/hybrid]
   • Location: [if applicable]

2. Participate in [specific research component]
   • Frequency: [how often]
   • Total time commitment: [duration]
   • What to expect: [brief description]

3. Provide feedback through [method]
   • Type of information collected: [specify]
   • How it will be recorded: [method]

The entire study will take approximately [total time] to complete over [time period].

Technical Requirements (if applicable):
• Internet connection
• Device specifications
• Any specific software or tools needed`
  },
  risks: {
    title: 'Risks and Benefits',
    content: `Potential Risks:
This study involves minimal risk, which means the risks are not greater than those encountered in daily life. However, you should be aware of the following:

1. [Specific risk point]
   • How we minimize this risk: [mitigation strategy]
   • What support is available: [resources/support]

2. [Another risk point, if applicable]
   • Precautions taken: [specific measures]
   • Available alternatives: [options]

Benefits:
While there may not be direct benefits to you for participating in this study, possible benefits include:

1. Personal Benefits
   • [Specific benefit]
   • [Another benefit]

2. Broader Benefits
   • Contribution to [field/knowledge area]
   • Impact on [community/practice]

Compensation:
• [Detail any compensation]
• [Payment method and timing]
• [Conditions, if any]`
  },
  confidentiality: {
    title: 'Confidentiality',
    content: `Your privacy and the confidentiality of your data will be protected in the following ways:

Data Collection & Storage:
1. Personal Information
   • What we collect: [specific data points]
   • How it's stored: [storage method]
   • Security measures: [specific protections]

2. Research Data
   • Format: [type of data]
   • Storage location: [where data is kept]
   • Retention period: [how long data is kept]

Privacy Protection Measures:
• Data encryption: [specifics]
• Access controls: [who has access]
• Anonymization: [how data is anonymized]

Data Sharing & Publication:
• How results will be shared
• What information will be included
• How privacy will be maintained

Your Rights:
• Access to your data
• Withdrawal of data
• Data deletion requests`
  },
  participation: {
    title: 'Voluntary Participation',
    content: `Your participation in this study is completely voluntary. You should understand that:

Rights as a Participant:
1. You can choose not to participate
2. You can withdraw at any time without penalty
3. You can skip any questions you don't want to answer
4. You can request your data be removed from the study

Process for Withdrawal:
• How to notify the research team
• What happens to your data
• Timeline for data removal

Impact of Withdrawal:
• Effect on compensation (if any)
• What data can/cannot be withdrawn
• Timeline for withdrawal processing

Alternatives to Participation:
• Other options available
• Alternative ways to receive benefits (if applicable)`
  },
  contact: {
    title: 'Contact and Custodian',
    content: `If you have questions or concerns about this research, please contact:

Principal Investigator:
[Name]
• Email: [email address]
• Phone: [phone number]
• Office: [location]

Research Team:
[Name(s)]
• Email: [email address]
• Phone: [phone number]

For questions about your rights as a research participant:
Institutional Review Board (IRB)
• Organization: [Institution name]
• Email: [IRB email]
• Phone: [IRB phone]
• Reference Number: [IRB protocol number]

Emergency Contacts:
• During business hours: [contact info]
• After hours: [contact info]
• For immediate assistance: [emergency numbers]`
  }
};

const ConsentTemplates = ({ onUpdateTemplate }) => {
  const handleEditTemplate = (sectionId, newContent) => {
    if (onUpdateTemplate) {
      onUpdateTemplate(sectionId, newContent);
    }
  };

  return (
    <div className="consent-templates-manager">
      {Object.entries(consentTemplates).map(([id, template]) => (
        <div key={id} className="template-section">
          <h3>{template.title}</h3>
          <textarea
            value={template.content}
            onChange={(e) => handleEditTemplate(id, e.target.value)}
            className="template-editor"
          />
        </div>
      ))}
    </div>
  );
};

export default ConsentTemplates;