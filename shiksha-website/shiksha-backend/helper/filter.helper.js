function getStartDate(filter, currentDate) {
	let startDate;

	switch (filter) {
		case "quarter-year":
			const startDateQuarter = new Date(currentDate);
			startDateQuarter.setMonth(currentDate.getMonth() - 2);
			startDateQuarter.setDate(1);
			startDate = startDateQuarter;
			break;
		case "half-year":
			const startDateHalfYear = new Date(currentDate);
			startDateHalfYear.setMonth(currentDate.getMonth() - 5);
			startDateHalfYear.setDate(1);
			startDate = startDateHalfYear;
			break;
		case "last-year":
			startDate = new Date(currentDate.getFullYear() - 1, 0, 1);
			break;
		case "current-year":
			startDate = new Date(currentDate.getFullYear(), 0, 1);
			break;
		default:
			startDate = new Date(
				currentDate.getFullYear(),
				currentDate.getMonth() - 5,
				1
			);
	}

	return startDate;
}

function getNumMonths(filter) {
	switch (filter) {
		case "quarter-year":
			return 3;
		case "half-year":
			return 6;
		case "last-year":
			return 12;
		case "current-year":
			return 12;
		default:
			return 6;
	}
}

function uniqueSubsets(arr) {
	const results = [];

	function helper(index, current) {
		if (index === arr.length) {
			if (current.length > 0) {
				// Skip the empty subset
				results.push([...current]);
			}
			return;
		}
		// Exclude the current element
		helper(index + 1, current);

		// Include the current element
		current.push(arr[index]);
		helper(index + 1, current);
		current.pop();
	}

	helper(0, []);
	return results;
}

const isLeapYear = (year) => {
	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };
  
  function validateIsoDate(value, helpers) {
	const dateString = value.toISOString().split('T')[0];
	const [year, month, day] = dateString.split('-').map(Number);
  
	if (month < 1 || month > 12) {
	  return helpers.error('date.invalid', { value });
	}
  
	const daysInMonth = [31, 28 + (isLeapYear(year) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

	if (day < 1 || day > daysInMonth[month - 1]) {
	  return helpers.error('date.invalid', { value });
	}
  
	return value;
  }
module.exports = { getStartDate, getNumMonths, uniqueSubsets , validateIsoDate };
