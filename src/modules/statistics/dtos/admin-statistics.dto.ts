export class AdminStatisticsDto {
  totalUsers: number;
  totalCompanies: number;
  totalRecruitments: number;
  totalApplications: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
  userChartStatistics: any;
  topCompanies: any;
}
