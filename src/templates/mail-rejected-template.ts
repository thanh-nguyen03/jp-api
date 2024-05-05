const template = (candidateName, jobTitle, companyName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Application Update - ${companyName}</title>
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
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Thank You for Your Interest, ${candidateName}</h1>
      <p>Application Update for the ${jobTitle} Position</p>
    </header>
    <main class="content">
      <p>Thank you for your interest in the ${jobTitle} position at ${companyName}. We appreciate the time you invested in applying.</p>
      <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
      <p>We encourage you to apply for future opportunities at ${companyName} that may be a better fit for your qualifications.</p>
      <p>We wish you all the best in your job search.</p>
    </main>
    <footer class="footer">
      <p>Sincerely,</p>
      <p>The ${companyName} Team</p>
    </footer>
  </div>
</body>
</html>

`;

export default template;
