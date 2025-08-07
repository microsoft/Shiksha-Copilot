const mongoose = require('mongoose');
const Schema =  mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;


const questionDistributionSchema = new Schema(
    {
      unit_name:{
        type:String
      },
      objective:{
        type:String
      }
    }
  )
  
  const templateSchema = new Schema(
    {
      type:{
        type:String
      },
      number_of_questions:{
        type:Number
      },
      marks_per_question:{
        type:Number
      },
      question_distribution:[questionDistributionSchema]
    }
  )

  const questionsSchema = new Schema({
    type:{
      type:String
    },
    numberOfQuestions:{
      type:Number
    },
    marksPerQuestion:{
      type:Number
    },
    questions:[{ type: Schema.Types.Mixed }]
  });
  

const questionBankCacheSummarySchema = new Schema({
    questionBankConfigId:{
        type: ObjectId,
        ref: "QuestionBankConfiguration",
        required: true,
    },
    totalQuestionsToFindInCache:{
        type:Number
    },
    cacheHit:{
        type:Number
    },
    cacheMiss:{
        type:Number
    },
    notFoundQuestions:{
      type:[templateSchema],
      default:undefined
    },
    notFoundResponse:{
      type:[questionsSchema],
      default:undefined
    },
    inProgress:{
      type:Boolean,
      default:false
  },
    processedCache:{
      type:[{ type: Schema.Types.Mixed }],
      default:undefined
    },
    isCacheUpdated:{
        type:Boolean,
        default:false
    },
    unitLevel:{type:String}
},
{
  timestamps:true,
  minimize:true
})

const QuestionBankCacheSummary = mongoose.model("QuestionBankCacheSummary",questionBankCacheSummarySchema);

module.exports = QuestionBankCacheSummary;