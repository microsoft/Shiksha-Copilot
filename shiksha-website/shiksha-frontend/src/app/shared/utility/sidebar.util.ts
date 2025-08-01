const assetURl = '../../../assets/icons';
export const menuItem = [
  getMenuItems(
    'Dashboard',
    '/user/dashboard',
    'dashboard.svg',
    'dashboard-light.svg',
    'dashboard',
    ['standard', 'power']
  ),
  getMenuItems(
    'Profile',
    '/user/profile',
    'profile.svg',
    'profile-light.svg',
    'profile',
    ['standard', 'power']
  ),
  getMenuItems(
    'Content Generation',
    '/user/content-generation',
    'content-generation.svg',
    'content-generation-light.svg',
    'content-generation',
    ['standard', 'power']
  ),
  getMenuItems(
    'Generation Status',
    '/user/generation-status',
    'generation-status.svg',
    'generation-status-light.svg',
    'generation-status',
    ['power']
  ),
  getMenuItems(
    'Chatbot',
    '/user/chatbot',
    'chatbot.svg',
    'chatbot-light.svg',
    'chatbot',
    ['power']
  ),
  getMenuItems(
    'Question Paper Generation',
    '/user/question-paper',
    'question-bank.svg',
    'question-bank-light.svg',
    'question-paper',
    ['standard', 'power']
  ),
  getMenuItems(
    'My Schedules',
    '/user/schedule',
    'schedule.svg',
    'schedule-light.svg',
    'schedule',
    ['standard', 'power']
  ),
  getMenuItems(
    'Dashboard',
    '/admin/dashboard',
    'dashboard.svg',
    'dashboard-light.svg',
    'dashboard',
    ['admin','manager']
  ),
  getMenuItems(
    'School Management',
    '/admin/school-management',
    'school-management.svg',
    'school-management-light.svg',
    'school-management',
    ['admin','manager']
  ),
  getMenuItems(
    'Teacher Management',
    '/admin/user-management',
    'user-management.svg',
    'user-management-light.svg',
    'user-management',
    ['admin','manager']
  ),
  getMenuItems(
    'Staff Management',
    '/admin/shikshana-user',
    'staff-management.svg',
    'staff-management-light.svg',
    'shikshana-user',
    ['admin']
  ),
  getMenuItems(
    'Content Activity',
    '/admin/content-activity',
    'content-activity.svg',
    'content-activity-light.svg',
    'content-activity',
    ['admin','manager']
  ),
  getMenuItems(
    'Audit Log',
    '/admin/audit-log',
    'audit-log-light.svg',
    'audit-log.svg',
    'audit-log',
    ['admin','manager']
  ),
  getMenuItems(
    'Help',
    '/user/help',
    'help-light.svg',
    'help.svg',
    'help',
    ['standard', 'power']
  )
  ,
  getMenuItems(
    'FAQ',
    '/faq',
    'faq-light.svg',
    'faq.svg',
    'faq',
    ['admin','manager','standard', 'power']
  )
  
];

function getMenuItems(
  text: string,
  route: string,
  darkIcon: string,
  lightIcon: string,
  match: string,
  permission: string[]
) {
  return {
    text,
    route,
    darkIcon: `${assetURl}/${darkIcon}`,
    lightIcon: `${assetURl}/${lightIcon}`,
    match,
    permission,
  };
}
