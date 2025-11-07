import { connect } from "mongoose";

export const dbConn = connect("mongodb://localhost:27017/qraphQlTest").then(
  () => {
    console.log("Database connected");
  }
);
