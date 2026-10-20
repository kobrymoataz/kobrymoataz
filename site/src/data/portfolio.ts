export const cvMailto = 'mailto:president@mycdic.org?subject=Curriculum%20Vitae%20Request%20-%20Moataz%20Kobry&body=Hello%20Mr%20Kobry%2C%0D%0A%0D%0AI%20would%20like%20to%20request%20your%20CV.%0D%0A%0D%0AName%3A%0D%0AOrganization%3A%0D%0APurpose%3A%0D%0A%0D%0ARegards%2C';

export const connections = {
  github: 'https://github.com/kobrymoataz',
  linkedin: 'https://www.linkedin.com/in/kobrymoataz/',
  instagram: 'https://www.instagram.com/kobrymoataz/',
  president: 'https://www.mycdic.org/president/',
  email: 'mailto:president@mycdic.org'
};

export const architecture = [
  { id: 'public', number: '01', title: 'Public platform', sub: 'Experience & access', detail: 'A clear public-facing website, application flows and verified institutional information are the starting point for the wider system.', tags: ['Web interfaces', 'User journeys', 'Intake'] },
  { id: 'api', number: '02', title: 'Application logic', sub: 'Rules & integrations', detail: 'Structured APIs and business rules connect the public interface with internal operations while keeping responsibilities clear.', tags: ['API contracts', 'Validation', 'Routing'] },
  { id: 'data', number: '03', title: 'Records & data', sub: 'Operational backbone', detail: 'Relational and document data support consistent records, internal visibility and traceable workflows.', tags: ['PostgreSQL', 'MongoDB', 'Record integrity'] },
  { id: 'automation', number: '04', title: 'Automation', sub: 'Execution at scale', detail: 'Google Apps Script, email workflows, document generation and task triggers reduce manual work in routine operations.', tags: ['Apps Script', 'Gmail', 'Documents'] },
  { id: 'verify', number: '05', title: 'Verification', sub: 'Trusted output', detail: 'Reference checks, controlled documents and visible status make institutional processes easier to follow and verify.', tags: ['Document references', 'Status', 'Traceability'] }
];

export const stack = {
  Languages: ['JavaScript', 'Python', 'Java', 'PHP'],
  Frontend: ['React', 'HTML / CSS', 'Accessible UI'],
  Backend: ['Node.js', 'REST APIs', 'Integrations'],
  Mobile: ['React Native', 'Cross-platform development'],
  Databases: ['MongoDB', 'PostgreSQL', 'SQL'],
  'Automation & tools': ['Google Apps Script', 'GitHub', 'GitHub Actions', 'Google Workspace']
};

export const mailLayers = [
  { id:'SPF', title:'Sender policy', copy:'Authorize the infrastructure allowed to send messages on behalf of a domain.' },
  { id:'DKIM', title:'Message signatures', copy:'Validate cryptographic signatures that tie email messages to an authenticated domain.' },
  { id:'DMARC', title:'Alignment & policy', copy:'Set domain-alignment policy, reporting and authentication handling for trusted communications.' },
  { id:'DNS', title:'Infrastructure records', copy:'Correct DNS records underpin domain verification, routing, and stable delivery.' }
];
