function checkOverlap(schedules) {
    const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Sort schedules by date and fromTime
    schedules.sort((a, b) => {
        if (a.date === b.date) {
            return timeToMinutes(a.fromTime) - timeToMinutes(b.fromTime);
        }
        return new Date(a.date) - new Date(b.date);
    });

    // Check for overlap
    for (let i = 0; i < schedules.length - 1; i++) {
        const current = schedules[i];
        const next = schedules[i + 1];

        if (current.date === next.date) {
            const currentEnd = timeToMinutes(current.toTime);
            const nextStart = timeToMinutes(next.fromTime);

            // If the next start time is less than the current end time, there is an overlap
            if (nextStart < currentEnd) {
                return true
            }
        }

    }

    return false
}

module.exports = checkOverlap;
