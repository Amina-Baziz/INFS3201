# INFS3201-4
repository for the Course Management System Project for INFS3102 
Members : 
1- Amina Baziz - 60300593
2- Wahed Shaik - 60302087
3- Talal Alamin - 60300943 

Note on MongoDB Connection Error
During testing or running the application, you might encounter the following error:
" Error: querySrv ENOTFOUND _mongodb._tcp.cluster0.t2dor.mongodb.net "
This issue is not caused by the application code. It occurs due to MongoDB Atlas connection limits on the free-tier (M0) cluster. When the number of active connections exceeds the allowed threshold, Atlas may reject new connections, causing this error to appear at random times. If this happens, simply restarting the server or the port usually resolves the issue. The application logic and MongoDB connection string are correct . 


Submitted on - 15/04/2025

