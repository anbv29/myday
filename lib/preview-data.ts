export type PreviewClaim = {
  rank: number;
  isoDate: string;
  fullDate: string;
  shortDate: string;
  month: string;
  day: string;
  year: string;
  amount: string;
  story: string;
  username: string;
  period: 'future' | 'past';
  distance: string;
  previousClaims: Array<{ amount: string; username: string; date: string }>;
};

export const claims: PreviewClaim[] = [
  {
    rank: 1,
    isoDate: '2027-08-18',
    fullDate: 'August 18, 2027',
    shortDate: 'AUG 18, 2027',
    month: 'AUGUST',
    day: '18',
    year: '2027',
    amount: '$1,250',
    story: "Launching the company I've been quietly building for three years.",
    username: '@foundername',
    period: 'future',
    distance: '358 DAYS TO GO',
    previousClaims: [
      { amount: '$640', username: '@firstmover', date: 'JUL 02, 2026' },
      { amount: '$320', username: '@augustkid', date: 'APR 18, 2026' },
    ],
  },
  {
    rank: 2,
    isoDate: '2028-02-14',
    fullDate: 'February 14, 2028',
    shortDate: 'FEB 14, 2028',
    month: 'FEBRUARY',
    day: '14',
    year: '2028',
    amount: '$880',
    story: 'The day we finally make it official.',
    username: '@twoplusone',
    period: 'future',
    distance: '538 DAYS TO GO',
    previousClaims: [{ amount: '$450', username: '@redroses', date: 'JUN 04, 2026' }],
  },
  {
    rank: 3,
    isoDate: '2030-01-01',
    fullDate: 'January 1, 2030',
    shortDate: 'JAN 01, 2030',
    month: 'JANUARY',
    day: '01',
    year: '2030',
    amount: '$720',
    story: 'One million people using something we made.',
    username: '@shipit',
    period: 'future',
    distance: '1,225 DAYS TO GO',
    previousClaims: [],
  },
  {
    rank: 4,
    isoDate: '2019-06-22',
    fullDate: 'June 22, 2019',
    shortDate: 'JUN 22, 2019',
    month: 'JUNE',
    day: '22',
    year: '2019',
    amount: '$510',
    story: 'We met by accident. Everything after was on purpose.',
    username: '@sundays',
    period: 'past',
    distance: '2,621 DAYS AGO',
    previousClaims: [{ amount: '$250', username: '@chance', date: 'MAR 11, 2026' }],
  },
  {
    rank: 5,
    isoDate: '2024-11-09',
    fullDate: 'November 9, 2024',
    shortDate: 'NOV 09, 2024',
    month: 'NOVEMBER',
    day: '09',
    year: '2024',
    amount: '$390',
    story: 'First marathon. Last excuse.',
    username: '@mileforty',
    period: 'past',
    distance: '654 DAYS AGO',
    previousClaims: [],
  },
];

export function findClaim(isoDate: string) {
  return claims.find((claim) => claim.isoDate === isoDate);
}
