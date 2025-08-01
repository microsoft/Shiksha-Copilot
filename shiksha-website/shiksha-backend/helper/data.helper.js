function createData(isLesson, chapter, subTopic, subject, isAll) {
	let newData;

	if (isLesson) {
		newData = {
			name: `${subject?.subjectName}-${chapter.board} Class${chapter.standard} ${chapter.topics}`,
			class: chapter.standard,
			medium: chapter.medium,
			semester: "1",
			board: chapter.board,
			subject: subject?.subjectName || "Delete",
			chapterId: chapter._id,
			teachingModel: ["model-1"],
			level: ["beginner"],
			subTopics: subTopic,
			instructionSet: [
				{
					type: "Engage",
					info: [
						{
							methodOfTeaching: "Concept Attainment Model",
							content: {
								main: "Introduction: \nWelcome to the fascinating world of Coordinate Geometry! This chapter will take you on a journey through the Cartesian System, where you will learn how to locate any point in a plane using just two numbers. Have you ever wondered how GPS works or how a drone can deliver a package to an exact location? The secret lies in the concept of Coordinate Geometry.\n\nKey Concepts: \nWe will explore the Cartesian System, a concept named after the French philosopher and mathematician René Déscartes. You will learn about the x and y axes that divide the plane into four quadrants and how to plot points on this plane using given coordinates.\n\nReal-world Scenario: \nImagine you are a pilot navigating a plane or a ship captain steering through the vast ocean. How do you find your way? Or think about how a robot is programmed to move in a specific direction. All these are possible because of Coordinate Geometry!\n\nNarrative: \nIn the 17th century, René Déscartes was lying in bed and noticed a fly buzzing around. He realized he could describe the fly's position at any given moment using two numbers - its distance from the walls. This simple observation led to the development of the Cartesian System, a fundamental concept in Coordinate Geometry.\n\nVocabulary: \nGet ready to encounter terms like 'Cartesian System', 'x-axis', 'y-axis', 'quadrants', 'coordinates', 'abscissa', and 'ordinate'. These words will become your tools to navigate the world of Coordinate Geometry.\n\nClassroom Process (Facilitating Activity): \nActivity: \"Classroom Treasure Hunt\"\n1. Preparation: \n   - The teacher will prepare small cards with coordinates written on them.\n   - The classroom will be divided into a grid system with x and y axes. Each desk or student can represent a coordinate point.\n2. Required Materials: \n   - Small cards\n   - Marker pens\n   - A small 'treasure' (could be a class trophy or a small prize)\n3. Obtaining Materials: \n   - Cards and marker pens can be sourced from the school stationery.\n   - The 'treasure' can be any small item available in the classroom.\n\nIn this activity, the teacher will hide the 'treasure' at a certain coordinate in the classroom. Students will be given cards with coordinates and they have to find the treasure using their understanding of Coordinate Geometry. This fun and interactive activity will not only engage students but also help them understand the practical application of the concepts they learn.",
							},
						},
					],
				},
				{
					type: "Explore",
					info: [
						{
							methodOfTeaching: "Concept Attainment Model",
							content: {
								main: "**EXPLORE PHASE CONTENT**:\n\nExploratory Questions:\n\n1. How does the Cartesian System help us in locating a point in a plane? \n   - This question encourages students to delve deeper into the concept of the Cartesian System introduced in the ENGAGE phase. They can explore how the Cartesian System, with its x and y axes and four quadrants, provides a systematic method for locating any point in a plane using coordinates. \n\n2. Why do we need more than one reference point to locate a point in a plane? \n   - This question prompts students to investigate the necessity of having more than one reference point in Coordinate Geometry. They can experiment with different scenarios, such as trying to find a friend's house on a street map or locating a 'treasure' in the classroom grid, to understand the importance of multiple reference points.\n\n3. How can we use distances from fixed lines to locate a point in a plane? \n   - This question invites students to explore the method of using distances from fixed lines, such as the x and y axes in the Cartesian System, to pinpoint a location. They can practice this skill by plotting points on a graph paper or the classroom grid using given coordinates.\n\n4. What is the relationship between coordinates and the position of a point in the plane? \n   - This question encourages students to investigate the correlation between a point's coordinates and its position in the Cartesian plane. They can experiment with plotting different points and observe how changing the coordinates alters the position of the point.\n\nHands-on Exploration:\n\n1. Classroom Seating Plan Activity: \n   - Students can apply their understanding of Coordinate Geometry to a real-world scenario by creating a seating plan for their classroom. Each desk can represent a coordinate point, and students can practice locating different desks using their coordinates.\n\n2. Coordinate Geometry in Everyday Life: \n   - Students can explore the relevance of Coordinate Geometry in everyday life by identifying its applications in various fields, such as navigation, robotics, and architecture. They can research and present examples of how Coordinate Geometry is used in these fields.\n\nThrough these exploratory questions and hands-on activities, students will be able to delve deeper into the topics introduced in the ENGAGE phase, fostering a deeper understanding of Coordinate Geometry and its significance.",
							},
						},
					],
				},
				{
					type: "Explain",
					info: [
						{
							methodOfTeaching: "Concept Attainment Model",
							content: {
								main: '**EXPLAIN PHASE CONTENT**:\n\n**Concept 1: Introduction to Coordinate Geometry**\n- "Definition": Coordinate Geometry is a branch of mathematics that allows us to precisely locate any point in a plane using coordinates. It is based on the Cartesian System, which uses two perpendicular lines (x and y axes) to define a point\'s position.\n- "Characteristics": The key characteristic of Coordinate Geometry is the use of coordinates to represent a point\'s position. Each point is defined by two numbers, known as its coordinates.\n- "Key Features and Facts": The concept of Coordinate Geometry was developed by René Déscartes in the 17th century. It is widely used in various fields such as navigation, robotics, and architecture.\n\n**Concept 2: Cartesian System**\n- "Definition": The Cartesian System is a coordinate system that uses two perpendicular lines, called axes, to define a point\'s position in a plane.\n- "Characteristics": The Cartesian System consists of two axes: the x-axis (horizontal) and the y-axis (vertical). The point where these axes intersect is called the origin. The plane is divided into four quadrants by these axes.\n- "Key Features and Facts": The Cartesian System is named after René Déscartes. It allows us to locate any point in a plane using a pair of numerical coordinates.\n\n**Concept 3: Plotting a Point in the Plane**\n- "Definition": Plotting a point in the plane involves marking a point on the Cartesian plane using its coordinates.\n- "Characteristics": Each point on the plane is represented by a pair of coordinates (x, y), where \'x\' is the distance from the y-axis (abscissa) and \'y\' is the distance from the x-axis (ordinate).\n- "Key Features and Facts": The coordinates of a point define its exact position on the plane. Changing the coordinates changes the position of the point.\n\n**Concept 4: Summary and Application**\n- "Definition": This concept involves reviewing the key concepts learned in the chapter and applying them to solve problems.\n- "Characteristics": This includes understanding the importance of Coordinate Geometry, recognizing the need for more than one reference point, and practicing plotting points using the classroom seating plan activity.\n- "Key Features and Facts": Coordinate Geometry is a fundamental concept in mathematics with wide-ranging applications in real-life situations.\n\n**Classroom Process (Facilitating Activity)**: \n\n1. **Continuation of the "Classroom Treasure Hunt" Activity**: \n   - Now that students have a good understanding of Coordinate Geometry and the Cartesian System, they will be given more complex coordinates to find the \'treasure\'. \n   - The teacher will prepare new cards with coordinates that fall in different quadrants of the classroom grid. \n   - Students will use their knowledge of Coordinate Geometry to locate the \'treasure\' using the given coordinates.\n\n2. **Recap of the Activity**: \n   - After the activity, the teacher will facilitate a discussion about the students\' experiences during the treasure hunt. \n   - Students will share their strategies for locating the \'treasure\' and discuss how their understanding of Coordinate Geometry helped them in the activity. \n   - The teacher will summarize the key learnings from the activity and reinforce the importance of Coordinate Geometry in practical scenarios.',
							},
						},
					],
				},
				{
					type: "Elaborate",
					info: [
						{
							methodOfTeaching: "Concept Attainment Model",
							content: {
								main: '**ELABORATE PHASE CONTENT**:\n\n**Real-World Scenarios**:\n\n1. **Scenario 1: Navigating a City Map**:\n   - Question: How would you use Coordinate Geometry to find a specific location on a city map of Bengaluru?\n   - Description: City maps can be thought of as a large Cartesian plane, with streets running east-west and north-south forming a grid. Each intersection can be considered a point with coordinates. To find a specific location, like a restaurant or a friend\'s house, you would need the coordinates of that point. This is similar to how GPS navigation works!\n\n2. **Scenario 2: Planning a Coastal Trip**:\n   - Question: If you are planning a trip along the coastal region of Karnataka, how can Coordinate Geometry help you plan your route?\n   - Description: The coordinates of different tourist spots can be plotted on a map. This can help you visualize the locations and plan the most efficient route. For instance, if you want to visit the beaches in Mangalore, Udupi, and Karwar, you can plot these points on a map and use Coordinate Geometry to determine the shortest route.\n\n3. **Scenario 3: Locating a Point in a Field**:\n   - Question: How would you use Coordinate Geometry to locate a specific point in a large field, like a cricket ground in Mysore?\n   - Description: Imagine the cricket ground as a Cartesian plane. The pitch can be the origin, and the boundaries can be the axes. Each point in the field can be represented by coordinates. For instance, if a player hits a six, you can use Coordinate Geometry to determine the exact location where the ball landed.\n\n**Interactive Activities**:\n\n1. **Activity 1: "City Map Treasure Hunt"** (for a classroom size of fewer than 30 students):\n   - Preparation: The teacher will prepare a large map of a city (like Bengaluru) on the classroom board or a large sheet of paper. The map will be divided into a grid system with x and y axes. Each intersection will represent a coordinate point.\n   - Process: The teacher will divide the students into small teams. Each team will be given a set of coordinates. The teams will have to locate the points on the city map using their understanding of Coordinate Geometry. The first team to correctly locate all their points wins the treasure hunt.\n   - Learning Outcome: This activity will help students apply their knowledge of Coordinate Geometry to a real-world scenario. It will also foster teamwork and communication among students.\n\n2. **Activity 2: "Classroom Quadrant Challenge"** (for a classroom size of more than 30 students):\n   - Preparation: The teacher will divide the classroom into four quadrants using tape or chalk lines. Each desk or student can represent a coordinate point.\n   - Process: The teacher will divide the students into large teams. Each team will be assigned a quadrant. The teacher will call out coordinates, and the teams will have to identify the point in their quadrant. The team that correctly identifies the most points wins the challenge.\n   - Learning Outcome: This activity will help students practice plotting points in different quadrants of the Cartesian plane. It will also encourage competition and teamwork among students.\n\nThese real-world scenarios and interactive activities will help students understand the practical significance of Coordinate Geometry and its natural occurrence in everyday life. They will also provide hands-on experiences that deepen students\' comprehension and extend their learning beyond the classroom.',
							},
						},
					],
				},
				{
					type: "Evaluate",
					info: [
						{
							methodOfTeaching: "Concept Attainment Model",
							content: {
								main: "Beginner Level:\n\nMultiple Choice Questions:\n1. What is the Cartesian system in mathematics?\n    a) A system of numbers\n    b) A system of coordinates\n    c) A system of equations\n    d) A system of shapes\n\n2. In the Cartesian plane, what are the x and y axes?\n    a) Two lines that intersect at a right angle\n    b) Two parallel lines\n    c) Two lines that intersect at an acute angle\n    d) Two lines that intersect at an obtuse angle\n\nAssessment Questions:\n1. What is the importance of locating points on a plane using coordinates?\n2. What do you understand by the term 'ordered pair' in the context of the Cartesian system?\n\nIntermediate Level:\n\nMultiple Choice Questions:\n1. If a point is located in the third quadrant of the Cartesian plane, which of the following is true about its coordinates?\n    a) Both coordinates are positive\n    b) Both coordinates are negative\n    c) The x-coordinate is positive and the y-coordinate is negative\n    d) The x-coordinate is negative and the y-coordinate is positive\n\n2. What is the coordinate of the origin in the Cartesian plane?\n    a) (1,1)\n    b) (0,0)\n    c) (1,0)\n    d) (0,1)\n\nAssessment Questions:\n1. Explain why we need two independent pieces of information to locate a point in a plane.\n2. Plot the points (2,3), (-2,-3), (-2,3), and (2,-3) on a Cartesian plane.\n\nAdvanced Level:\n\nMultiple Choice Questions:\n1. If a point P has coordinates (x, y) in the Cartesian plane, what will be the coordinates of the point when it is reflected about the y-axis?\n    a) (x, y)\n    b) (-x, y)\n    c) (x, -y)\n    d) (-x, -y)\n\n2. What is the distance between the points (2,3) and (2, -3) on a Cartesian plane?\n    a) 2 units\n    b) 3 units\n    c) 6 units\n    d) 9 units\n\nAssessment Questions:\n1. Explain the significance of the Cartesian coordinate system in real-life situations.\n2. Given a seating plan of your classroom, represent the seating arrangement using a Cartesian plane. Assign coordinates to each desk and write down the coordinates of your desk and your friend's desk.",
							},
						},
					],
				},
			],
			learningOutcomes: [
				"Learn new phrases and their meanings",
				"Understand and identify rhyming words",
				"Develop storytelling skills through group activities",
				"Enhance creative thinking by describing and discussing the content of pictures",
			],
			extractedResources: [
				{
					section: "questionbank",
					data: [
						{
							difficulty: "beginner",
							content: [
								{
									type: "MCQs",
									questions: [
										{
											question:
												"What are the organisms called that can make their own food?",
											options: [
												"A) Heterotrophs, B) Autotrophs, C) Parasites, D) Saprotrophs",
											],
										},
										{
											question:
												"Which of the following is NOT a component of food?",
											options: [
												"A) Carbohydrates, B) Proteins, C) Carbon dioxide, D) Vitamins",
											],
										},
									],
								},
								{
									type: "assessment",
									questions: [
										{
											question:
												"Define autotrophic nutrition and give an example of an organism that uses this mode of nutrition.",
										},
									],
								},
							],
						},
						{
							difficulty: "intermediate",
							content: [
								{
									type: "MCQs",
									questions: [
										{
											question:
												"How do plants obtain the raw materials required for photosynthesis?",
											options: [
												"A) From the soil through their leaves, B) From the air through their roots, C) From the soil through their roots, D) From the air through their leaves",
											],
										},
										{
											question:
												"What is the role of chlorophyll in photosynthesis?",
											options: [
												"A) Absorbing water, B) Absorbing solar energy, C) Releasing oxygen, D) Transporting nutrients",
											],
										},
									],
								},
								{
									type: "assessment",
									questions: [
										{
											question:
												"Explain how the process of photosynthesis in plants demonstrates autotrophic nutrition. Include the roles of water, carbon dioxide, and sunlight in your answer.",
										},
									],
								},
							],
						},
						{
							difficulty: "advanced",
							content: [
								{
									type: "MCQs",
									questions: [
										{
											question:
												"Which statement best describes the relationship between animals and plants in terms of nutrition?",
											options: [
												"A) Animals provide food for all plants, B) Animals and plants do not depend on each other for food, C) Animals are directly or indirectly dependent on plants for food, D) Plants are directly dependent on animals for food",
											],
										},
									],
								},
								{
									type: "assessment",
									questions: [
										{
											question:
												'Analyze the statement: "Without plants, there would be no life on Earth." Discuss this statement in the context of the nutritional relationships between plants and animals, including the concepts of autotrophic and heterotrophic nutrition.',
										},
									],
								},
							],
						},
					],
				},
				{
					section: "realworldscenarios",
					data: [
						{
							difficulty: "intermediate",
							content: [
								{
									title: "The Green Heart of Karnataka's Western Ghats",
									question:
										"In the dense forests of the Western Ghats, how do the vast varieties of plants contribute to the nutrition of local wildlife?",
									description:
										"The Western Ghats are home to a rich biodiversity of plants performing photosynthesis, thus serving as the primary producers in this ecosystem. These plants convert sunlight into chemical energy, creating food not only for themselves but also for a myriad of herbivorous animals. These animals, in turn, become prey for carnivores, illustrating the direct and indirect dependence of animals on plants for nutrition.",
								},
								{
									title: "The Agricultural Plains of North Karnataka",
									question:
										"How does the practice of crop rotation in North Karnataka's agricultural fields benefit the nutritional needs of the plants?",
									description:
										"Crop rotation involves growing different types of crops in the same area across a sequence of seasons. This practice helps in maintaining soil nutrients and reduces soil erosion. Leguminous plants, often part of the rotation, fix nitrogen in the soil, enhancing its fertility. This natural enrichment of the soil supports the autotrophic nutrition of subsequent crops by providing essential minerals.",
								},
							],
						},
						{
							difficulty: "advanced",
							content: [
								{
									title: "Coastal Karnataka's Mangrove Ecosystem",
									question:
										"In the unique ecosystem of Coastal Karnataka's mangroves, how do plants adapt to obtain their nutrition in saline water?",
									description:
										"Mangrove plants have specialized roots called pneumatophores that rise above the water's surface to absorb oxygen directly from the air. This adaptation allows them to perform photosynthesis efficiently in oxygen-poor, saline water environments, showcasing the incredible adaptability of plant nutrition mechanisms in diverse habitats.",
								},
							],
						},
					],
				},
				{
					section: "activities",
					data: [
						{
							id: "activity_1",
							title: "Mystery Box of Nutrition",
							preparation:
								"Prepare a 'Mystery Box' containing items representing different modes of nutrition (e.g., a small plant, a piece of bread, a toy animal, and a picture of the sun). Write brief descriptions for each item.",
							required_materials:
								"A box, a small live plant or a leaf, a piece of bread or any food item, a toy animal or animal figurine, and a picture or drawing of the sun.",
							obtaining_materials:
								"The box can be any cardboard box available at home or school. The small plant or leaf can be sourced from the school garden. The piece of bread or food item and the toy animal or figurine can be brought from home or borrowed. The picture of the sun can be created by the students.",
							recap:
								"Summarize the activity by highlighting the differences between autotrophic and heterotrophic nutrition, emphasizing the importance of plants in the ecosystem.",
						},
						{
							id: "activity_2",
							title: "Plant Nutrition Relay",
							preparation:
								"Create a relay race setup with stations for sunlight, water, carbon dioxide, and minerals. Each team collects a symbol of their component and explains its role in plant nutrition.",
							required_materials:
								"Symbols for sunlight (yellow ball), water (blue ribbon), carbon dioxide, minerals, and a 'plant' at the starting line.",
							obtaining_materials:
								"Materials can be found within the classroom or brought from home. Symbols can be created using available resources.",
							recap:
								"Discuss how each component is crucial for autotrophic nutrition in plants and encourage teamwork.",
						},
					],
				},
			],
			isAll: isAll,
			videos: [],
			documents: [],
			interactOutput: [],
			isDeleted: false,
		};
	} else {
		newData = {
			lessonName: `${subject?.subjectName}-${chapter.board} Class${chapter.standard} ${chapter.topics}`,
			class: chapter.standard,
			medium: chapter.medium,
			semester: "1",
			board: chapter.board,
			subject: subject?.subjectName || "Delete",
			chapterId: chapter._id,
			teachingModel: ["model-1"],
			levels: ["beginner"],
			subTopics: subTopic,
			resources: [
				{
					methodOfTeaching: "handsonactivity",
					content: {
						main: "Activity 1: Coordinate Geometry Treasure Hunt (Individual Task)\nTopic: 9.1 Introduction\n\nPreparation and Execution:\n1. The teacher will prepare a map of the school or classroom with a grid overlay, marking specific locations with coordinates.\n2. Each student will receive a copy of the map and a list of coordinates.\n3. The students will have to locate the points on the map using the coordinates and write down what is at that location.\n4. The first student to correctly identify all locations wins.\n\nMaterials:\n- Paper maps with grid overlay (1 per student)\n- List of coordinates (1 per student)\n\nRecap:\nThis activity helps students understand the importance of locating points on a plane using coordinates. They learn that more than one reference point is needed to accurately locate a point.\n\nActivity 2: Classroom Seating Plan (Collaborative Activity)\nTopic: 9.2 Cartesian System\n\nPreparation and Execution:\n1. The teacher will divide the class into groups of 5-6 students.\n2. Each group will be tasked with creating a seating plan for the classroom using a Cartesian coordinate system.\n3. The groups will present their seating plans to the class, explaining their reasoning and how they used the Cartesian system.\n\nMaterials:\n- Graph paper (1 per group)\n- Pencils and erasers (1 per student)\n\nRecap:\nThis activity helps students understand the Cartesian coordinate system and how it can be used to locate points in a plane. They also learn about the x and y axes and the four quadrants.\n\nActivity 3: Plot the Point (Group Activity)\nTopic: 9.3 Plotting a Point in the Plane if its Coordinates are Given\n\nPreparation and Execution:\n1. The teacher will divide the class into teams.\n2. The teacher will call out coordinates, and each team will have to quickly plot the point on a large graph paper.\n3. The team that plots the most points correctly wins.\n\nMaterials:\n- Large graph paper (1 per team)\n- Markers (1 per team)\n\nRecap:\nThis activity helps students practice plotting points on the Cartesian plane using given coordinates. They learn the relationship between coordinates and the position of a point in the plane.\n\nActivity 4: Coordinate Geometry Quiz (Whole Class Activity)\nTopic: 9.4 Summary\n\nPreparation and Execution:\n1. The teacher will prepare a quiz covering all the topics in the chapter.\n2. The students will answer the quiz individually, then discuss the answers as a class.\n\nMaterials:\n- Quiz sheets (1 per student)\n- Pencils (1 per student)\n\nRecap:\nThis activity helps students review the key concepts and skills learned in the chapter. They apply their knowledge of coordinate geometry to solve problems and reflect on its importance in real-life situations.",
					},
				},
				{
					methodOfTeaching: "questionbank",
					content: {
						main: "Beginner Level:\n\nMultiple Choice Questions:\n1. What is the name of the horizontal line in the Cartesian system?\n    a) y-axis\n    b) x-axis\n    c) z-axis\n    d) w-axis\n\n2. What is the name of the point where the x and y axes intersect?\n    a) Origin\n    b) Intersection\n    c) Cross\n    d) Center\n\n3. What are the coordinates of the origin?\n    a) (1,1)\n    b) (0,0)\n    c) (1,0)\n    d) (0,1)\n\n4. What is the name of the vertical line in the Cartesian system?\n    a) x-axis\n    b) y-axis\n    c) z-axis\n    d) w-axis\n\n5. What is the name of the distance of a point from the y-axis?\n    a) Ordinate\n    b) Abscissa\n    c) Coordinate\n    d) Distance\n\nAssessment Questions:\n1. What is the Cartesian system? \n2. What are the x and y axes?\n3. What are the four quadrants in the Cartesian plane?\n4. How do you locate a point in the Cartesian plane using its coordinates?\n5. What is the importance of the origin in the Cartesian system?\n\nIntermediate Level:\n\nMultiple Choice Questions:\n1. If a point lies in the first quadrant, what can you say about its coordinates?\n    a) Both coordinates are positive\n    b) Both coordinates are negative\n    c) The x-coordinate is positive and the y-coordinate is negative\n    d) The x-coordinate is negative and the y-coordinate is positive\n\n2. What does the coordinate (5,0) represent in the Cartesian plane?\n    a) A point on the x-axis\n    b) A point on the y-axis\n    c) The origin\n    d) A point in the first quadrant\n\n3. If a point is located on the x-axis, what will be its y-coordinate?\n    a) 0\n    b) 1\n    c) -1\n    d) The same as its x-coordinate\n\n4. What is the significance of the positive direction in the Cartesian system?\n    a) It represents the opposite direction\n    b) It represents the same direction\n    c) It represents the vertical direction\n    d) It represents the horizontal direction\n\n5. If a point P has coordinates (3, -2), in which quadrant is it located?\n    a) Quadrant I\n    b) Quadrant II\n    c) Quadrant III\n    d) Quadrant IV\n\nAssessment Questions:\n1. How is the Cartesian system used in real-life situations?\n2. How do you determine the coordinates of a point in the Cartesian plane?\n3. What is the significance of the x and y axes in the Cartesian system?\n4. Describe how you would plot multiple points on the Cartesian plane if their coordinates are given.\n5. Explain the difference between a point's position in the plane and its coordinates.",
					},
				},
				{
					methodOfTeaching: "realworldscenario",
					content: {
						main: "Original Answer: Topic 9.1 Introduction\n\nBeginner: Imagine you are in a park in Bengaluru and you want to find a specific tree. You know that the tree is 5 steps from the entrance and 3 steps to the right. How would you describe the location of the tree to a friend?\n\nIntermediate: Now, imagine the park is much larger, like Cubbon Park, and the tree is 50 steps from the entrance and 30 steps to the right. How would you describe the location of the tree to a friend who is not familiar with the park?\n\nAdvanced: Suppose you are a city planner in Mangalore and you need to locate a specific building in the city. The building is located 500 meters east and 300 meters north from the city center. How would you describe the location of the building to a colleague?\n\nTopic 9.2 Cartesian System\n\nBeginner: Imagine you are playing a game of chess in Mysore. How would you describe the position of a chess piece on the board to your opponent?\n\nIntermediate: Now, imagine you are a cricket coach in Hubli and you want to describe the position of a fielder to a player. How would you do that using the Cartesian system?\n\nAdvanced: Suppose you are a scientist in Dharwad and you are studying the movement of a particle in a two-dimensional space. How would you describe the position of the particle at any given time using the Cartesian system?\n\nTopic 9.3 Plotting a Point in the Plane if its Coordinates are Given\n\nBeginner: Imagine you are a student in Belgaum and your teacher has given you the coordinates (3, 2) on a graph paper. How would you plot this point?\n\nIntermediate: Now, imagine you are a weather scientist in Karwar and you have been given the coordinates of a cyclone in the Arabian Sea. How would you plot the position of the cyclone on a map?\n\nAdvanced: Suppose you are an engineer in Bengaluru and you are designing a building. You have been given the coordinates of the corners of the building on a blueprint. How would you plot these points?\n\nTopic 9.4 Summary\n\nBeginner: Imagine you are a student in Shimoga and you have just learned about coordinate geometry. How would you summarize what you have learned to a friend?\n\nIntermediate: Now, imagine you are a teacher in Davangere and you want to summarize the key points of coordinate geometry to your students. How would you do that?\n\nAdvanced: Suppose you are a mathematician in Tumkur and you are writing a research paper on coordinate geometry. How would you summarize the key concepts and applications of coordinate geometry in your paper?",
					},
				},
			],
			isDeleted: false,
		};
	}

	return newData;
}

const subjectRegex = /Subject=([^,]+)/;
const standardRegex = /Grade=([^,]+)/;
const titleRegex = /Title=([^,]+(?:,[^,]+)*)/;
const orderNumberRegex = /Number=([^,]+)/;
const boardRegex = /Board=([^,]+)/;
const mediumRegex = /Medium=([^,]+)/;
const semRegex = /Subject=[^_]+_[^/]+/; 
const nameRegex = /Subject=([a-zA-Z_]+)_\d+/;

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

module.exports = {
	createData,
	subjectRegex,
	standardRegex,
	titleRegex,
	orderNumberRegex,
	boardRegex,
	mediumRegex,
	capitalizeFirstLetter,
	semRegex,
	nameRegex
};

