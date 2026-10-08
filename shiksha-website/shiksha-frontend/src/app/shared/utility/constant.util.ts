export const LOGIN_ROUTE = '/auth'

export const MAX_FILE_SIZE = 5 * 1024 * 1024; 

export const BULK_UPLOAD_FILE_TYPES = [".xlsx"];

export const DEFAULT_LANGUAGE = [{name:'English',value:'en'}];

export const LOC_LANGUAGES:any[] = [
    {
        state:'Karnataka',
        value:[
            {name:'ಕನ್ನಡ',value:'kn'}
        ]
    },
    {
        state:'Telangana',
        value:[
          {name:'తెలుగు',value:'tg'}
        ]
    }
]

export const MEDIUMS = [{name:'English',value:'english'}, {name:'Kannada',value:'kannada'}, {name:'Telugu',value:'telugu'}]

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
        name:"Objective Questions (MCQ)",
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
        name:"Very Short Answer",
        value:"Answer the following in a word, phrase or sentence"
    },
    {
        name:"Short Answer",
        value:"Answer the following in two or three sentences each"
    },
    {
        name:"Answer the following questions",
        value:"Answer the following questions"
    },
    {
        name:"Long Answer",
        value:"Answer the following question in four or five sentences"
    }
]

export const QUESTION_TYPE_MAPPER:any = {
        "Four alternatives are given for each of the following questions, choose the correct alternative":"Objective Questions (MCQ)",
        "Fill in the blanks with suitable words":"Fill in the blanks with suitable words",
        "Match the following":"Match the following",
        "Answer the following in a word, phrase or sentence":"Very Short Answer",
        "Answer the following in two or three sentences each":"Short Answer",
        "Answer the following questions":"Answer the following questions",
        "Answer the following question in four or five sentences":"Long Answer",
}

export const CORE_SUBJECTS = ['Science','Social Science','Mathematics','Evs'];

export const CORE_OBJECTIVE_MAPPER = [{objective:'Knowledge', percentage_distribution:25},{objective:'Understanding', percentage_distribution:45},{objective:'Application', percentage_distribution:20},{objective:'Skill', percentage_distribution:10}];

export const CORE_OBJECTIVE_MAPPER_10 = [{objective:'Knowledge', percentage_distribution:10},{objective:'Understanding', percentage_distribution:55},{objective:'Application', percentage_distribution:20},{objective:'Skill', percentage_distribution:15}];

export const LANGUAGE_OBJECTIVE_MAPPER = [{objective:'Knowledge', percentage_distribution:25},{objective:'Comprehension', percentage_distribution:40},{objective:'Expression', percentage_distribution:30},{objective:'Appreciation', percentage_distribution:5}];

export const TELANGANA_OBJECTIVE_MAPPER = [{objective:'Knowledge', percentage_distribution:10},{ objective:'Understanding', percentage_distribution:20},{ objective:'Application', percentage_distribution:30},{ objective:'Higher order thinking', percentage_distribution:40}]

export const RESOURCE_MAPPER: any = {
    activities: 'Activities',
    questionbank: 'Question Bank',
    realworldscenarios: 'Real World Scenarios',
  };

export const CCE_TYPE_MAPPER:any = {
    'Science':'cce_tools_math_science',
    'Mathematics':'cce_tools_math_science',
    'Evs':'cce_tools_math_science',
    'Social Science':'cce_tools_social',
    'English 2':'cce_tools_english'
}