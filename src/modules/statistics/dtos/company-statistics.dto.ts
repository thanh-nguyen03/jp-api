export class CompanyStatisticsDto {
  totalRecruitments: number;
  totalApplications: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
}
