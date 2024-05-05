const template = (candidateName, jobTitle, companyName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Application Successful - ${companyName}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
    }

    .container {
      max-width: 600px;
      margin: 50px auto;
      padding: 30px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }

    .header {
      text-align: center;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }

    p {
      font-size: 16px;
      line-height: 1.5;
    }

    .content {
      margin-top: 30px;
    }

    .next-steps,
    .contact {
      margin-top: 20px;
    }

    h2 {
      font-size: 18px;
      margin-bottom: 10px;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Congratulations, ${candidateName}!</h1>
      <p>Your application for the ${jobTitle} position at ${companyName} has been successful!</p>
    </header>
    <main class="content">
      <p>We were impressed by your resume and cover letter, particularly your [mention specific skill or experience from the application].</p>
      <section class="next-steps">
        <h2>Next Steps:</h2>
        <p>In the coming days, you will receive a separate email from HR Department to discuss the next steps in the interview process. This email will provide details on interview schedule and additional information needed.</p>
      </section>
    </main>
    <footer class="footer">
      <p>We look forward to learning more about your qualifications and your potential contribution to our team.</p>
      <p>Sincerely,</p>
      <p>The ${companyName} Team</p>
    </footer>
  </div>
</body>
</html>
`;

export default template;
