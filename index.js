const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const dbConn = require("./Database/dbConnection");
const Student = require("./Database/models/studentModel");
const Course = require("./Database/models/courseModel");

const port = 4000;

const typeDefs = gql`
  type Student {
    name: String!
    email: String!
    age: Int!
    major: String
    courses: [Course]!
  }

  type Course {
    title: String!
    code: String!
    credits: Int!
    instructor: String!
    students: [Student]!
  }

  type Query {
    getAllStudents: [Student]!
    getStudent(id: ID!): Student
    getAllCourses: [Course]!
    getCourse(id: ID!): Course
    searchStudentsByMajor(major: String!): [Student]!
  }

  type Mutation {
    addStudent(
      name: String!
      email: String!
      age: Int!
      major: String
    ): Student!

    updateStudent(
      id: ID!
      name: String
      email: String
      age: Int
      major: String
    ): Student

    deleteStudent(id: ID!): Student

    addCourse(
      title: String!
      code: String!
      credits: Int!
      instructor: String!
    ): Course

    updateCourse(
      id: ID!
      title: String
      code: String
      credits: Int
      instructor: String
    ): Course

    deleteCourse(id: ID!): Course
  }
`;

const resolvers = {
  Query: {
    getAllStudents: async () => Student.find(),
    getStudent: async (_, { id }) => Student.findById(id),
    getAllCourses: async () => Course.find().populate("students"),
    getCourse: async (_, { id }) => Course.findById(id).populate("students"),
    searchStudentsByMajor: async (_, { major }) => Student.find({ major }),
  },

  Mutation: {
    addStudent: async (_, args) => {
      const student = new Student(args);
      return student.save();
    },
    updateStudent: async (_, { id, ...fields }) =>
      Student.findByIdAndUpdate(id, fields, { new: true }),
    deleteStudent: async (_, { id }) => Student.findByIdAndDelete(id),

    addCourse: async (_, args) => {
      const course = new Course(args);
      return course.save();
    },
    updateCourse: async (_, { id, ...fields }) =>
      Course.findByIdAndUpdate(id, fields, { new: true }),
    deleteCourse: async (_, { id }) => Course.findByIdAndDelete(id),
  },

  Student: {
    courses: async (parent) => Course.find({ students: parent._id }),
  },

  Course: {
    students: async (parent) => Student.find({ _id: { $in: parent.students } }),
  },
};

const startServer = async () => {
  //dbConn();
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();
  server.applyMiddleware({ app, path: "/graphQl" });

  app.listen(port, () => {
    console.log(`Server listening at PORT: ${port}`);
  });
};
startServer();
