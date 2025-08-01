export const LOGIN_ROUTE = '/auth'

export const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export const BULK_UPLOAD_FILE_TYPES = [".xlsx"];

export const LANGUAGES = [{name:'English',value:'en'},{name:'ಕನ್ನಡ',value:'kn'}]

export const MEDIUMS = [{name:'English',value:'english'}, {name:'Kannada',value:'kannada'}]

export const CLASS_OPTIONS = [1,2,3,4,5,6,7,8,9,10]

export const LOADER_RESTRICTED_URLS = [
    '/chapter/list',
    '/master-lesson/list/',
    '/resource-plan/list/',
    '/teacher-lesson-plan/list',
    '/auth/me',
    '/chat/',
    '/lessonchat/'
]

export const IDLE_START_THRESHOLD = 180;

export const IDLE_WARNING_THRESHOLD = 1620;

export const INTERACTION_LOG_THRESHOLD = 10;

export const QUESTION_TYPE = [
    {
        name:"Multiple Choice Questions/MCQ",
        value:"Four alternatives are given for each of the following questions, choose the correct alternative"
    },
    {
        name:"Fill in the blanks with suitable words",
        value:"Fill in the blanks with suitable words"
    },
    {
        name:"Match the following",
        value:"Match the following"
    },
    {
        name:"Answer the following in a word, phrase or sentence",
        value:"Answer the following in a word, phrase or sentence"
    },
    {
        name:"Answer the following in two or three sentences each",
        value:"Answer the following in two or three sentences each"
    },
    {
        name:"Answer the following questions",
        value:"Answer the following questions"
    },
    {
        name:"Answer the following question in four or five sentences",
        value:"Answer the following question in four or five sentences"
    }
]

export const QUESTION_TYPE_MAPPER:any = {
        "Four alternatives are given for each of the following questions, choose the correct alternative":"Multiple Choice Questions/MCQ",
        "Fill in the blanks with suitable words":"Fill in the blanks with suitable words",
        "Match the following":"Match the following",
        "Answer the following in a word, phrase or sentence":"Answer the following in a word, phrase or sentence",
        "Answer the following in two or three sentences each":"Answer the following in two or three sentences each",
        "Answer the following questions":"Answer the following questions",
        "Answer the following question in four or five sentences":"Answer the following question in four or five sentences",
}

export const CORE_SUBJECTS = ['Science','Social Science','Mathematics','Evs'];

export const CORE_OBJECTIVE_MAPPER = [{objective:'Knowledge', percentage_distribution:25},{objective:'Understanding', percentage_distribution:45},{objective:'Application', percentage_distribution:20},{objective:'Skill', percentage_distribution:10}];

export const CORE_OBJECTIVE_MAPPER_10 = [{objective:'Knowledge', percentage_distribution:10},{objective:'Understanding', percentage_distribution:55},{objective:'Application', percentage_distribution:20},{objective:'Skill', percentage_distribution:15}];

export const LANGUAGE_OBJECTIVE_MAPPER = [{objective:'Knowledge', percentage_distribution:25},{objective:'Comprehension', percentage_distribution:40},{objective:'Expression', percentage_distribution:30},{objective:'Appreciation', percentage_distribution:5}];
