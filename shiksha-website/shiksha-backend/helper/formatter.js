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
	return match ? match[1] : 1; 
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
	convertToCamelCase
};
