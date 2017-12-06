const dateInSeconds = (jsonDateString) => ~~(Date.parse(jsonDateString) / 1000)

module.exports = {
    target: '0xa3d736079d6bf7c14a96ab3ad131c349ceaf141e',

    phase1Date: dateInSeconds('2018-01-08T16:00:00.000Z'),
    phase2Date: dateInSeconds('2018-01-15T16:00:00.000Z'),
    phase3Date: dateInSeconds('2018-01-22T16:00:00.000Z'),
    phase4Date: dateInSeconds('2018-01-29T16:00:00.000Z'),
    endDate: dateInSeconds('2018-02-12T16:00:00.000Z'),

    phase1Rate: 1200,
    phase2Rate: 1100,
    phase3Rate: 1050,
    phase4Rate: 1000,

    minCap: 1000,
    maxCap: 54000
}