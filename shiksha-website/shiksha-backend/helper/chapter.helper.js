function compareChapter(chapterId, chapter, existingLp) {
  const chapterObj = {
    board: existingLp?.board,
    medium: existingLp?.medium,
    grade: existingLp?.class,
    subject: existingLp?.subject,
    orderNumber: chapter?.orderNumber,
    level: existingLp?.isAll ? "CHAPTER" : "SUBTOPIC",
    topics: existingLp?.isAll ? "ALL" : existingLp?.subTopics.join(";"),
  };

  const compareId = `Board=${chapterObj.board}/Medium=${chapterObj.medium}/Grade=${chapterObj.grade}/Subject=${chapterObj.subject}/Number=${chapterObj.orderNumber}/Level=${chapterObj.level}/Topics=${chapterObj.topics}`;

  if (chapterId === compareId) {
    return true;
  }
  return false;
}

module.exports = compareChapter;
