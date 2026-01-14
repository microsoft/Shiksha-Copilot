const MasterResource = require("../models/master.resource.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
class MasterResourceAggregation {
	async getMasterResourcesFilter(page, limit, filter, sort) {
		try {
			let pipeline = [
				{
					$lookup: {
						from: "chapters",
						localField: "chapterId",
						foreignField: "_id",
						as: "chapter",
					},
				},
				{
					$unwind: "$chapter",
				},
				{ $match: filter },
				{
					$facet: {
						data: [
							{ $sort: sort },
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
						],
						totalCount: [{ $count: "count" }],
					},
				},
			];

			let resources = await MasterResource.aggregate(pipeline);

			if (resources) return resources;

			return [];
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregation --> getMasterLessonFilter"
			);
			throw err;
		}
	}

	async getSubtopicResourceListByChapterId(chapterId,templateIds) {
		try {
			let pipeline = [
				{
					$match: {
						chapterId: new ObjectId(chapterId),
						templateId: { $in: templateIds.map(id => new ObjectId(id)) },
					},
				},
				{
					$project: {
						_id: 1,
						isAll: 1,
						subTopics: 1,
						learningOutcomes: 1,
					},
				},
			];

			let subtopics = await MasterResource.aggregate(pipeline);

			if (subtopics) return subtopics;

			return [];
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregation --> getSubtopicResourceListByChapterId"
			);
			throw err;
		}
	}

	async generateResourcePlan(resourceId, filters = {}) {
		try {
			const levelFilter = [
				{
					$addFields: {
						resources: {
							$filter: {
								input: "$resources",
								as: "resource",
								cond: {
									$or: [
										{ $eq: ["$$resource.section", "questionbank"] },
										{ $eq: ["$$resource.section", "realworldscenarios"] },
										{ $eq: ["$$resource.section", "activities"] },
									],
								},
							},
						},
						additionalResources: {
							$filter: {
								input: "$additionalResources",
								as: "additionalResource",
								cond: {
									$or: [
										{ $eq: ["$$additionalResource.section", "questionbank"] },
										{
											$eq: [
												"$$additionalResource.section",
												"realworldscenarios",
											],
										},
										{ $eq: ["$$additionalResource.section", "activities"] },
									],
								},
							},
						},
					},
				},
				{
					$addFields: {
						resources: {
							$map: {
								input: "$resources",
								as: "resource",
								in: {
									$mergeObjects: [
										"$$resource",
										{
											data: {
												$filter: {
													input: {
														$map: {
															input: "$$resource.content",
															as: "dataItem",
															in: {
																$cond: {
																	if: {
																		$ifNull: ["$$dataItem.difficulty", false],
																	},
																	then: {
																		$cond: {
																			if: {
																				$in: [
																					"$$dataItem.difficulty",
																					filters.levels,
																				],
																			},
																			then: "$$dataItem",
																			else: null,
																		},
																	},
																	else: "$$dataItem",
																},
															},
														},
													},
													as: "filteredDataItem",
													cond: { $ne: ["$$filteredDataItem", null] },
												},
											},
										},
									],
								},
							},
						},
						additionalResources: {
							$map: {
								input: "$additionalResources",
								as: "additionalResource",
								in: {
									$mergeObjects: [
										"$$additionalResource",
										{
											data: {
												$filter: {
													input: {
														$map: {
															input: "$$additionalResource.content",
															as: "dataItem",
															in: {
																$cond: {
																	if: {
																		$ifNull: ["$$dataItem.difficulty", false],
																	},
																	then: {
																		$cond: {
																			if: {
																				$in: [
																					"$$dataItem.difficulty",
																					filters.levels,
																				],
																			},
																			then: "$$dataItem",
																			else: null,
																		},
																	},
																	else: "$$dataItem",
																},
															},
														},
													},
													as: "filteredDataItem",
													cond: { $ne: ["$$filteredDataItem", null] },
												},
											},
										},
									],
								},
							},
						},
					},
				},
			];

			// const newLevelFilter =  [
			// 	{
			// 	  $addFields: {
			// 		resources: {
			// 		  $filter: {
			// 			input: "$resources",
			// 			as: "resource",
			// 			cond: { $gt: [{ $size: "$$resource.content" }, 0] }
			// 		  }
			// 		},
			// 		additionalResources: {
			// 		  $filter: {
			// 			input: "$additionalResources",
			// 			as: "additionalResource",
			// 			cond: { $gt: [{ $size: "$$additionalResource.content" }, 0] }
			// 		  }
			// 		}
			// 	  }
			// 	},
			// 	{
			// 	  $addFields: {
			// 		resources: {
			// 			$map: {
			// 				input: "$resources",
			// 				as: "resource",
			// 				in: {
			// 				  id: "$$resource.id",
			// 				  title: "$$resource.title",
			// 				  outputFormat: "$$resource.outputFormat",
			// 				  content: {
			// 					$filter: {
			// 					  input: {
			// 						$map: {
			// 						  input: "$$resource.content",
			// 						  as: "dataItem",
			// 						  in: {
			// 							$cond: {
			// 							  if: { $ifNull: ["$$dataItem.difficulty", false] },
			// 							  then: {
			// 								$cond: {
			// 								  if: { $in: ["$$dataItem.difficulty", filters.levels] },
			// 								  then: "$$dataItem",
			// 								  else: null
			// 								}
			// 							  },
			// 							  else: "$$dataItem"
			// 							}
			// 						  }
			// 						}
			// 					  },
			// 					  as: "filteredDataItem",
			// 					  cond: { $ne: ["$$filteredDataItem", null] }
			// 					}
			// 				  }
			// 				}
			// 			  }
						  
			// 		},
			// 		additionalResources: {
			// 		  $map: {
			// 			input: "$additionalResources",
			// 			as: "additionalResource",
			// 			in: {
			// 			  $mergeObjects: [
			// 				"$$additionalResource",
			// 				{
			// 				  data: {
			// 					$filter: {
			// 					  input: {
			// 						$map: {
			// 						  input: "$$additionalResource.content",
			// 						  as: "dataItem",
			// 						  in: {
			// 							$cond: {
			// 							  if: { $ifNull: ["$$dataItem.difficulty", false] },
			// 							  then: {
			// 								$cond: {
			// 								  if: { $in: ["$$dataItem.difficulty", filters.levels] },
			// 								  then: "$$dataItem",
			// 								  else: null
			// 								}
			// 							  },
			// 							  else: "$$dataItem"
			// 							}
			// 						  }
			// 						}
			// 					  },
			// 					  as: "filteredDataItem",
			// 					  cond: { $ne: ["$$filteredDataItem", null] }
			// 					}
			// 				  }
			// 				}
			// 			  ]
			// 			}
			// 		  }
			// 		}
			// 	  }
			// 	}
			//   ];
			  

			const newLevelFilter = [
  // Step 1: Filter out empty contents
  {
    $addFields: {
      resources: {
        $filter: {
          input: "$resources",
          as: "resource",
          cond: {
            $or: [
              { $and: [{ $isArray: "$$resource.content" }, { $gt: [{ $size: "$$resource.content" }, 0] }] },
              { $and: [{ $not: { $isArray: "$$resource.content" } }, { $ne: ["$$resource.content", ""] }] }
            ]
          }
        }
      },
      additionalResources: {
        $filter: {
          input: "$additionalResources",
          as: "additionalResource",
          cond: {
            $or: [
              { $and: [{ $isArray: "$$additionalResource.content" }, { $gt: [{ $size: "$$additionalResource.content" }, 0] }] },
              { $and: [{ $not: { $isArray: "$$additionalResource.content" } }, { $ne: ["$$additionalResource.content", ""] }] }
            ]
          }
        }
      }
    }
  },

  // Step 2: Apply difficulty filtering if content is array, else pass content as-is
  {
    $addFields: {
      resources: {
        $map: {
          input: "$resources",
          as: "resource",
          in: {
            id: "$$resource.id",
            title: "$$resource.title",
            outputFormat: "$$resource.outputFormat",
            content: {
              $cond: {
                if: { $isArray: "$$resource.content" },
                then: {
                  $filter: {
                    input: {
                      $map: {
                        input: "$$resource.content",
                        as: "dataItem",
                        in: {
                          $cond: {
                            if: { $ifNull: ["$$dataItem.difficulty", false] },
                            then: {
                              $cond: {
                                if: { $in: ["$$dataItem.difficulty", filters.levels] },
                                then: "$$dataItem",
                                else: null
                              }
                            },
                            else: "$$dataItem"
                          }
                        }
                      }
                    },
                    as: "filteredDataItem",
                    cond: { $ne: ["$$filteredDataItem", null] }
                  }
                },
                else: "$$resource.content"
              }
            }
          }
        }
      },
      additionalResources: {
        $map: {
          input: "$additionalResources",
          as: "additionalResource",
          in: {
            $mergeObjects: [
              "$$additionalResource",
              {
                data: {
                  $cond: {
                    if: { $isArray: "$$additionalResource.content" },
                    then: {
                      $filter: {
                        input: {
                          $map: {
                            input: "$$additionalResource.content",
                            as: "dataItem",
                            in: {
                              $cond: {
                                if: { $ifNull: ["$$dataItem.difficulty", false] },
                                then: {
                                  $cond: {
                                    if: { $in: ["$$dataItem.difficulty", filters.levels] },
                                    then: "$$dataItem",
                                    else: null
                                  }
                                },
                                else: "$$dataItem"
                              }
                            }
                          }
                        },
                        as: "filteredDataItem",
                        cond: { $ne: ["$$filteredDataItem", null] }
                      }
                    },
                    else: "$$additionalResource.content"
                  }
                }
              }
            ]
          }
        }
      }
    }
  }
]

			let pipeline = [
				{
					$match: { _id: new ObjectId(resourceId) },
				},
				{
					$lookup: {
						from: "chapters",
						localField: "chapterId",
						foreignField: "_id",
						as: "chapter",
					},
				},
				{
					$unwind: "$chapter",
				},
				{
					$lookup: {
						from: "mastersubjects",
						localField: "chapter.subjectId",
						foreignField: "_id",
						as: "subjects",
					},
				},
				{
					$unwind: "$subjects",
				},
				{
					$lookup: {
						from: "lessonplantemplates",
						localField: "templateId",
						foreignField: "_id",
						as: "template",
					},
				},
				{
					$unwind: "$template",
				},
				
			];

			if (filters.levels?.length > 0) {
				pipeline = [...pipeline, ...newLevelFilter];
			}

			let resources = await MasterResource.aggregate(pipeline);

			if (resources?.length > 0) {
				return { success: true, data: resources };
			} else {
				return { success: false, data: null };
			}
		} catch (err) {
			console.log(
				"Error --> MasterResourceAggregarion --> generateResourcePlan",
				err
			);
			throw err;
		}
	}
}

const masterResourceAggregation = new MasterResourceAggregation();

module.exports = masterResourceAggregation;
