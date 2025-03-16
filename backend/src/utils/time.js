import moment from 'moment';

async function getStartOfCurrentWeekUTC(userTimezoneOffset) {
  const nowUTC = moment().utc();
  const nowLocal = nowUTC.clone().subtract(userTimezoneOffset, 'minutes');
  const startOfWeekLocal = nowLocal.clone().startOf('isoWeek');
  const startOfWeekUTC = startOfWeekLocal.clone().add(userTimezoneOffset, 'minutes').toDate();

  return startOfWeekUTC;
}

async function getStartOfPreviousWeekUTC(userTimezoneOffset) {
  const nowUTC = moment().utc();
  const nowLocal = nowUTC.clone().subtract(userTimezoneOffset, 'minutes');
  const startOfWeekLocal = nowLocal.clone().startOf('isoWeek');
  const startOfWeekUTC = startOfWeekLocal.clone().add(userTimezoneOffset, 'minutes');
  const startOfPreviousWeekUTC = startOfWeekUTC.clone().subtract(7, 'days').toDate();

  return startOfPreviousWeekUTC;
}

async function getStartOfTodayUTC(userTimezoneOffset) {
  const nowUTC = moment().utc();
  const nowLocal = nowUTC.clone().subtract(userTimezoneOffset, 'minutes');
  const startOfTodayLocal = nowLocal.clone().startOf('day');
  const startOfTodayUTC = startOfTodayLocal.clone().add(userTimezoneOffset, 'minutes').toDate();

  return startOfTodayUTC;
}

async function getStartOfYesterdayUTC(userTimezoneOffset) {
  const nowUTC = moment().utc();
  const nowLocal = nowUTC.clone().subtract(userTimezoneOffset, 'minutes');
  const startOfTodayLocal = nowLocal.clone().startOf('day');
  const startOfTodayUTC = startOfTodayLocal.clone().add(userTimezoneOffset, 'minutes');
  const startOfYesterdayUTC = startOfTodayUTC.clone().subtract(1, 'days').toDate();

  return startOfYesterdayUTC;
}

async function getDaysBeforeUTC(userTimezoneOffset, daysBefore) {
  const nowUTC = moment().utc();
  const nowLocal = nowUTC.clone().subtract(userTimezoneOffset, 'minutes');
  const startOfTodayLocal = nowLocal.clone().startOf('day');
  const startOfTodayUTC = startOfTodayLocal.clone().add(userTimezoneOffset, 'minutes');
  const daysBeforeToday = startOfTodayUTC.clone().subtract(daysBefore, 'days').toDate();
  return daysBeforeToday;
}

export {
  getStartOfCurrentWeekUTC,
  getStartOfPreviousWeekUTC,
  getStartOfTodayUTC,
  getStartOfYesterdayUTC,
  getDaysBeforeUTC,
};
