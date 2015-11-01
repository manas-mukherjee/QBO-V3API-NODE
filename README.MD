To run the sample
----------------------

1) clone the project in your system

2) CD into project_location

3) run npm install. This will pull all the dependencies needed.

4) open app.js in editor of your choice

5) add your consumerKey and consumerKeySecret (development tokens if using sandbox). If you are using production tokens, 
make sure to change the Quickbooks object initializer to pass 'sandbox' flag as false.

6) run node app.js

7) in the browser, navigate to http://localhost:3000/start

8) click on ConnectToQuickbooks button

9) once you complete the authorization flow, you can access http://localhost:3000/companies to see the list of persisted Oauth tokens for the companies.# QBO-V3API-NODE
