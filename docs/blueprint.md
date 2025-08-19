# **App Name**: SchoolRoute

## Core Features:

- User Authentication: User authentication system with 3 levels of privileges: Secretary, School Employee (add students), and School Employee (view only).
- School Registration: School Registration: Allows Level 3 users to register schools, including Name and Address (with map search and selection). Each school gets a unique hash key. Note: Map integration uses an external tool (API).
- Employee Registration: Employee Registration: Allows registration of employees, with approval and privilege assignment (levels 1-3) by Level 3 users. Employees use the school's unique hash key for registration.
- Student Registration: Student Registration: Enables Level 2 employees to register students with details like Name, CPF, RA, RG, School Year, Class, Address (with map search), and Contact Information.
- Student Search: Student Search: School employees can list students in their institution.  Secretary level employees have access to search across all schools, filtered by RA, CPF, School, Year, and Class.
- Student Profile: Student Profile: On selecting a student, display a modal with tabs for 'Data', 'Documents', 'Enrollments', and 'School History'. Allows adding new enrollment records.
- Hash Key Generation: Unique hash key for each school creation

## Style Guidelines:

- Primary color: #4A777A, a muted teal hue associated with knowledge, precision, and forward-thinking organizations.
- Background color: #F0F4F4, a very light cool gray, almost white, provides a neutral backdrop that does not distract.
- Accent color: #A66A49, a warm brown, creates contrast, suggesting a feeling of the natural world, but in an understated way.
- Font pairing: 'Inter' (sans-serif) for headlines and body text. Its objective and neutral look is suited to tabular data.
- Use simple, professional icons. Use meaningful icons in the school and student management screens, making the interface intuitive.
- A clean, well-spaced layout should use grids to maintain alignment and a sense of order. Data tables should be clearly formatted and easy to read, as that will be a key feature.
- Subtle transitions and animations for actions to enhance user experience without being distracting.