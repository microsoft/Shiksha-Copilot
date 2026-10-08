const _ = require('lodash');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

function groupByBoard(data) {
	const groupedData = [];

	data.forEach((item) => {
		const { board, medium, ...itemWithoutBoardMedium } = item;

		let boardEntry = groupedData.find((entry) => entry.board === board);

		if (!boardEntry) {
			boardEntry = {
				board: board,
				mediums: [],
			};
			groupedData.push(boardEntry);
		}

		let mediumEntry = boardEntry.mediums.find(
			(entry) => entry.medium === medium
		);

		if (!mediumEntry) {
			mediumEntry = {
				medium: medium,
				classes: [],
			};
			boardEntry.mediums.push(mediumEntry);
		}

		mediumEntry.classes.push(itemWithoutBoardMedium);
	});

	return groupedData;
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function restructureResources(json) {
	const result = [];

	// Restructure questionbank
	const questionBank = { section: "questionbank", data: [] };
	for (const [difficulty, types] of Object.entries(json.questionbank)) {
		const difficultyData = { difficulty, content: [] };
		for (const [type, content] of Object.entries(types)) {
			const typeData = { type, questions: content.content };
			difficultyData.content.push(typeData);
		}
		questionBank.data.push(difficultyData);
	}
	result.push(questionBank);

	// Restructure realworldscenarios
	const realWorldScenarios = { section: "realworldscenarios", data: [] };
	for (const [difficulty, topics] of Object.entries(json.realworldscenarios)) {
		const difficultyData = { difficulty, content: [] };
		for (const topic of Object.values(topics)) {
			const topicData = {
				title: topic.title,
				question: topic.scenario.question,
				description: topic.scenario.description,
			};
			difficultyData.content.push(topicData);
		}
		realWorldScenarios.data.push(difficultyData);
	}
	result.push(realWorldScenarios);

	// Restructure activities
	const activities = { section: "activities", data: [] };
	for (const [id, activity] of Object.entries(json.activities)) {
		const activityData = { id, ...activity };
		activities.data.push(activityData);
	}
	result.push(activities);

	return result;
}

function restructureResourcesNew(sections) {
	const extractedResult = [];
	const additionalResult = [];

	const parseByFormat = (resource, format) => {
		const data = [];

		if (!resource) return data;

		switch (format) {
			case 'json_1': {
				for (const [difficulty, types] of Object.entries(resource)) {
					const difficultyData = { difficulty, content: [] };
					for (const [type, typeData] of Object.entries(types)) {
						difficultyData.content.push({
							type,
							questions: typeData.content
						});
					}
					data.push(difficultyData);
				}
				break;
			}

			case 'json_2': {
				for (const [difficulty, topics] of Object.entries(resource)) {
					const difficultyData = { difficulty, content: [] };
					for (const topic of Object.values(topics)) {
						difficultyData.content.push({
							title: topic.title,
							question: topic.scenario.question,
							description: topic.scenario.description
						});
					}
					data.push(difficultyData);
				}
				break;
			}

			case 'json_3': {
				for (const [id, activity] of Object.entries(resource)) {
					data.push({ id, ...activity });
				}
				break;
			}

			default:
				console.warn(`Unsupported output format: ${format}`);
		}

		return data;
	};

	for (const section of sections) {
		const { section_id: id, section_title: title, outputFormat, content } = section;
		const extracted = content.extracted_resource || content.extracted_resources;
		const additional = content.additional_resource || content.additional_resources;

		if (extracted) {
			extractedResult.push({
				id,
				title,
				outputFormat,
				content: parseByFormat(extracted, outputFormat)
			});
		}

		if (additional) {
			additionalResult.push({
				id,
				title,
				outputFormat,
				content: parseByFormat(additional, outputFormat)
			});
		}
	}

	return {
		extracted: extractedResult,
		additional: additionalResult
	};
}




function restructureInstructionSet(data) {
	let formattedInstructionSet = [];
	Object.keys(data).forEach((is) => {
		formattedInstructionSet.push({
			type: capitalizeFirstLetter(is),
			info: [
				{
					methodOfTeaching: "Concept Attainment Model",
					content: {
						main: data[is].content,
					},
				},
			],
		});
	});

	return formattedInstructionSet;
}

function restructureCheckList(data) {
	let formattedCheckList = [];
	Object.keys(data).forEach((cl) => {
	  formattedCheckList.push({
		type: cl,
		activity: data[cl].activity,
		materials: data[cl].materials,
	  });
	});
  
	return formattedCheckList;
  }

  function restructureCheckListforLLM(data) {
	let formattedCheckList = {};
	for(let type of data)
	{
		formattedCheckList[type.type]= {
			activity:type.activity,
			materials:type.materials
		}
	}
	return formattedCheckList;
  }

  function sortDataBySubTopics(data) {
    let allSubTopicEntry = data.find((i) => i.isAll);

    let result = [];
    if (allSubTopicEntry?._id) {
        result.push(allSubTopicEntry);
    }

    let sortSubTopics = data
        .filter((item) => !item.isAll)
        .sort((a, b) => {
            const subTopicAMatch = a.subTopics[0].match(/^\d+(\.\d+)?/);
            const subTopicBMatch = b.subTopics[0].match(/^\d+(\.\d+)?/);
            if (!subTopicAMatch || !subTopicBMatch) {
                return a.subTopics[0].localeCompare(b.subTopics[0]);
            }

            const subTopicA = subTopicAMatch[0];
            const subTopicB = subTopicBMatch[0];
            const partsA = subTopicA.split('.').map(Number);
            const partsB = subTopicB.split('.').map(Number);
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const diff = (partsA[i] || 0) - (partsB[i] || 0);
                if (diff !== 0) {
                    return diff;
                }
            }
            return a.subTopics[0].localeCompare(b.subTopics[0]);
        });

    result = [...result, ...sortSubTopics];

    return result;
}

function sortSubTopicsArray(data) {
    return data.sort((a, b) => {
        const subTopicA = parseFloat(a.subtopic[0].split(" ")[0]);
        const subTopicB = parseFloat(b.subtopic[0].split(" ")[0]);

        return subTopicA - subTopicB;
	})
}

function sortSubTopicsArrayTeacher(subtopics) {
    return subtopics
        .map(subtopic => {
            const isAnyLessonAll = subtopic.lessons.some(lesson => lesson.isAll);
            return {
                ...subtopic,
                isAnyLessonAll
            };
        })
        .sort((a, b) => {
            if (a.isAnyLessonAll && !b.isAnyLessonAll) return -1;
            if (!a.isAnyLessonAll && b.isAnyLessonAll) return 1;
            
            const subTopicAMatch = a.subtopic[0].match(/^\d+(\.\d+)?/);
            const subTopicBMatch = b.subtopic[0].match(/^\d+(\.\d+)?/);
            
            if (!subTopicAMatch || !subTopicBMatch) {
                return a.subtopic[0].localeCompare(b.subtopic[0]);
            }
            
            const subTopicA = subTopicAMatch[0];
            const subTopicB = subTopicBMatch[0];
            const partsA = subTopicA.split('.').map(Number);
            const partsB = subTopicB.split('.').map(Number);
            
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const diff = (partsA[i] || 0) - (partsB[i] || 0);
                if (diff !== 0) {
                    return diff;
                }
            }
            
            return a.subtopic[0].localeCompare(b.subtopic[0]);
        })
        .map(({ isAnyLessonAll, ...rest }) => rest);
}
const parseDate = (dateStr, isStartOfDay = true) => {
    const [ year , month , day] = dateStr.split('-');
    
    let date = new Date(`${year}-${month}-${day}`);
    
    if (isStartOfDay) {
        date.setHours(0, 0, 0, 0);  
    } else {
        date.setHours(23, 59, 59, 999);
    }

    const istOffset = 5.5 * 60 * 60 * 1000;
    date = new Date(date.getTime() + istOffset); 

    return date;
};

function formatSubject(subject) {
	return subject
		.replace(/_\d+$/, '')
		.replace(/_\d+/g, '')        
		.replace(/_/g, ' ')           
		.replace(/\b\w/g, char => char.toUpperCase()); 
}

function getSemester(subject) {
	const match = subject.match(/_(\d+)$/); 
	return match ? match[1] : 0; 
}

function convertToCamelCase(data) {
	if (Array.isArray(data)) {
	  return data.map(item => convertToCamelCase(item));
	} else if (data !== null && typeof data === 'object') {
	  if (data instanceof ObjectId) {
		return data.toHexString();
	  }
  
	  const camelCasedObject = Object.keys(data).reduce((acc, key) => {
		const newKey = key === '_id' ? '_id' : _.camelCase(key);
		acc[newKey] = convertToCamelCase(data[key]);
		return acc;
	  }, {});
  
	  return camelCasedObject;
	} else {
	  return data;
	}
  }
  

function formatSections(sections, templateSections) {
  const formattedSections = sections.map((e) => {
    const matchingTemplate = templateSections.find(
      (t) => t.id === e.section_id
    );

    return {
      id: e.section_id,
      title: e.section_title,
      content: e.content,
      outputFormat: matchingTemplate ? matchingTemplate.outputFormat : null,
    };
  });

  return formattedSections;
}



function oldFormatStructuredData(data, checklist, templateSections) {
  const formattedSections = Object.entries(data).map(([key, value]) => {
    const matchingTemplate = templateSections.find(
      (t) => t.title.toLowerCase() === key
    );

    return {
      id: key,
      title: matchingTemplate ? matchingTemplate.title : null,
      content: value.content,
      outputFormat: matchingTemplate ? matchingTemplate.outputFormat : null,
    };
  });

  const checklistContent = Object.entries(checklist).reduce((acc, [key, value]) => {
    acc[key.toLowerCase()] = value;
    return acc;
  }, {});

  const checklistTemplate = templateSections.find(
    (t) => t.title.toLowerCase() === "checklist"
  );

  formattedSections.push({
    id: checklistTemplate ? checklistTemplate.id : "section_checklist",
    title: checklistTemplate ? checklistTemplate.title : "Checklist",
    content: checklistContent,
    outputFormat: checklistTemplate ? checklistTemplate.outputFormat : "json_5E_checklist",
  });

  return formattedSections;
}


function transformSections(sections, templateSections) {
  return sections.map(section => {
    const template = templateSections.find(
      t => t.id === section.section_id
    );

    const outputFormat = template ? template.outputFormat : null;

    let formattedContent;

    // json_1: Question Bank
    if (outputFormat === "json_1") {
      formattedContent = Object.entries(section.content || {}).map(([difficulty, levelContent]) => {
        const items = [];

        if (levelContent.MCQs) {
          items.push({
            type: "MCQs",
            questions: levelContent.MCQs.content
          });
        }

        if (levelContent.assessment) {
          items.push({
            type: "assessment",
            questions: levelContent.assessment.content
          });
        }

        return {
          difficulty,
          content: items
        };
      });
    }

    // json_2: Real World Scenarios
    else if (outputFormat === "json_2") {
      formattedContent = Object.entries(section.content || {}).map(([difficulty, topics]) => {
        const topicList = Object.values(topics).map(topic => ({
          title: topic.title,
          question: topic.scenario.question,
          description: topic.scenario.description
        }));

        return {
          difficulty,
          content: topicList
        };
      });
    }

    // json_3: Activities
    else if (outputFormat === "json_3") {
      formattedContent = Object.entries(section.content || {}).map(([activityId, activity]) => ({
        id: activityId,
        title: activity.title,
        preparation: activity.preparation,
        required_materials: activity.required_materials,
        obtaining_materials: activity.obtaining_materials,
        recap: activity.recap
      }));
    }

    // Default fallback
    else {
      formattedContent = section.content;
    }

    return {
      id:section.section_id,
      title:section.section_title,
      outputFormat,
      content: formattedContent
    };
  });
}


function transformResource(resource) {
  if (!resource) return null;

  const transformQuestionBank = (qb) => {
    return Object.entries(qb).map(([difficulty, types]) => ({
      difficulty,
      content: Object.entries(types).map(([type, data]) => ({
        type,
        questions: data.content.map(q => {
          if (type === "MCQs") {
            return {
              question: q.question,
              options: q.options.map((opt, i) => {
                const label = String.fromCharCode(65 + i); // A, B, C, D
                return `${label}) ${opt}`;
              })
            };
          } else {
            return { question: q.question };
          }
        })
      }))
    }));
  };

  const transformRealWorldScenarios = (rws) => {
    return Object.entries(rws).map(([difficulty, topics]) => ({
      difficulty,
      content: Object.values(topics).map(topic => ({
        title: topic.title,
        question: topic.scenario.question,
        description: topic.scenario.description
      }))
    }));
  };

  const transformActivities = (activities) => {
    return Object.entries(activities).map(([id, activity]) => ({
      id,
      title: activity.title,
      preparation: activity.preparation,
      required_materials: activity.required_materials,
      obtaining_materials: activity.obtaining_materials,
      recap: activity.recap
    }));
  };

  return [
    {
      id: "question_bank",
      title: "Question Bank",
      outputFormat: "json_1",
      content: transformQuestionBank(resource.questionbank)
    },
    {
      id: "real_world_scenarios",
      title: "Real World Scenarios",
      outputFormat: "json_2",
      content: transformRealWorldScenarios(resource.realworldscenarios)
    },
    {
      id: "activities",
      title: "Activities",
      outputFormat: "json_3",
      content: transformActivities(resource.activities)
    }
  ];
}

function transformOldResources(extracted_resource, additional_resource) {
  return {
    extracted: transformResource(extracted_resource),
    additional: transformResource(additional_resource)
  };
}

function formatTemplate(template){
	const formattedTemplate = {
		_id:template.workFlowId,
		name:template.name,
		description:template.description,
		sections:formatTemplateSections(template.sections)
	}

	return formattedTemplate
}

function formatTemplateSections(sections){
	const outputFormatMapper = {
		plain_text:null,
		json_1:{
			"beginner": {
				"MCQs": {
					"content": [
						{
							"question": "",
							"options": [
								"",
								"",
								"",
								""
							]
						}
					]
				},
				"assessment": {
					"content": [
						{
							"question": ""
						}
					]
				}
			},
			"intermediate": {
				"MCQs": {
					"content": [
						{
							"question": "",
							"options": [
								"",
								"",
								"",
								""
							]
						}
					]
				},
				"assessment": {
					"content": [
						{
							"question": ""
						}
					]
				}
			},
			"advanced": {
				"MCQs": {
					"content": [
						{
							"question": "",
							"options": [
								"",
								"",
								"",
								""
							]
						}
					]
				},
				"assessment": {
					"content": [
						{
							"question": ""
						}
					]
				}
			}
		},
		json_2:{
			"beginner": {
				"topic_1": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				},
				"topic_2": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				}
			},
			"intermediate": {
				"topic_1": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				},
				"topic_2": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				}
			},
			"advanced": {
				"topic_1": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				},
				"topic_2": {
					"title": "",
					"scenario": {
						"description": "",
						"question": ""
					}
				}
			}
		},
		json_3:{
			"activity_1": {
				"title": "",
				"preparation": "",
				"required_materials": "",
				"obtaining_materials": "",
				"recap": ""
			},
			"activity_2": {
				"title": "",
				"preparation": "",
				"required_materials": "",
				"obtaining_materials": "",
				"recap": ""
			}
		},
		json_5E_checklist:{
			"engage": {
				"activity": "",
				"materials": ""
			},
			"explore": {
				"activity": "",
				"materials": ""
			},
			"explain": {
				"activity": "",
				"materials": ""
			},
			"elaborate": {
				"activity": "",
				"materials": ""
			},
			"evaluate": {
				"activity": "",
				"materials": ""
			}
		}
	}

	const formattedSections = sections.map((ele) => {
		const sectionDetails= {
			id:ele.id,
			title:ele.title,
			description:ele.description,
			dependencies:ele.dependencies,
			mode:ele.mode
		}
		if(outputFormatMapper[ele.outputFormat]){
			sectionDetails.output_format = outputFormatMapper[ele.outputFormat]
		}
		return sectionDetails
	});

	return formattedSections
}



module.exports = {
	groupByBoard,
	restructureResources,
	sortDataBySubTopics,
	restructureInstructionSet,
	restructureCheckList,
	sortSubTopicsArray,
	sortSubTopicsArrayTeacher,
	parseDate,
	restructureCheckListforLLM,
	formatSubject,
	getSemester,
	convertToCamelCase,
	formatSections,
	restructureResourcesNew,
	transformSections,
	oldFormatStructuredData,
	transformOldResources,
	formatTemplate
};
