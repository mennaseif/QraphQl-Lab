const express = require("express");
const {
  ApolloServer,
  gql,
  AuthenticationError,
} = require("apollo-server-express");
const dbConn = require("./Database/dbConnection");
const Student = require("./Database/models/studentModel");
const Course = require("./Database/models/courseModel");
const User = require("./Database/models/userModel");
require("dotenv").config();

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const port = 4000;

//dbConn();

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input StudentUpdateInput {
    name: String
    email: String
    age: Int
    major: String
  }

  input CourseUpdateInput {
    title: String
    code: String
    credits: Int
    instructor: String
  }

  input ListOptions {
    limit: Int
    offset: Int
    sortBy: String
    sortOrder: String
  }

  input StudentFilter {
    major: String
    nameContains: String
    minAge: Int
    maxAge: Int
  }

  input CourseFilter {
    codePrefix: String
    titleContains: String
    instructor: String
    minCredits: Int
    maxCredits: Int
  }

  type Student {
    id: ID!
    name: String!
    email: String!
    age: Int!
    major: String
    courses: [Course!]!
    coursesCount: Int!
  }

  type Course {
    id: ID!
    title: String!
    code: String!
    credits: Int!
    instructor: String!
    students: [Student!]!
    studentsCount: Int!
  }

  type Query {
    getAllStudents(filter: StudentFilter, options: ListOptions): [Student!]!
    getStudent(id: ID!): Student
    getAllCourses(filter: CourseFilter, options: ListOptions): [Course!]!
    getCourse(id: ID!): Course
  }

  type Mutation {
    signup(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    addStudent(
      name: String!
      email: String!
      age: Int!
      major: String
    ): Student!
    updateStudent(id: ID!, input: StudentUpdateInput!): Student!
    deleteStudent(id: ID!): Boolean!

    addCourse(
      title: String!
      code: String!
      credits: Int!
      instructor: String!
    ): Course!
    updateCourse(id: ID!, input: CourseUpdateInput!): Course!
    deleteCourse(id: ID!): Boolean!

    enrollStudent(studentId: ID!, courseId: ID!): Student!
    unenrollStudent(studentId: ID!, courseId: ID!): Student!
  }
`;

const resolvers = {
  Student: {
    courses: async (parent) => {
      await parent.populate("courses");
      return parent.courses;
    },
    coursesCount: (parent) => parent.courses.length,
  },

  Course: {
    students: async (parent) => {
      await parent.populate("students");
      return parent.students;
    },
    studentsCount: (parent) => parent.students.length,
  },

  Query: {
    getAllStudents: async (_, { filter = {}, options = {} }) => {
      const query = {};

      if (filter.major) query.major = filter.major;
      if (filter.nameContains)
        query.name = { $regex: filter.nameContains, $options: "i" };
      if (filter.minAge || filter.maxAge) {
        query.age = {};
        if (filter.minAge) query.age.$gte = filter.minAge;
        if (filter.maxAge) query.age.$lte = filter.maxAge;
      }

      const sort = {};
      if (options.sortBy)
        sort[options.sortBy] = options.sortOrder === "DESC" ? -1 : 1;

      const limit = Math.min(options.limit || 10, 50);
      const offset = options.offset || 0;

      return Student.find(query).sort(sort).skip(offset).limit(limit);
    },

    getStudent: async (_, { id }) => Student.findById(id),

    getAllCourses: async (_, { filter = {}, options = {} }) => {
      const query = {};

      if (filter.instructor) query.instructor = filter.instructor;
      if (filter.titleContains)
        query.title = { $regex: filter.titleContains, $options: "i" };
      if (filter.codePrefix)
        query.code = { $regex: `^${filter.codePrefix}`, $options: "i" };
      if (filter.minCredits || filter.maxCredits) {
        query.credits = {};
        if (filter.minCredits) query.credits.$gte = filter.minCredits;
        if (filter.maxCredits) query.credits.$lte = filter.maxCredits;
      }

      const sort = {};
      if (options.sortBy)
        sort[options.sortBy] = options.sortOrder === "DESC" ? -1 : 1;

      const limit = Math.min(options.limit || 10, 50);
      const offset = options.offset || 0;

      return Course.find(query).sort(sort).skip(offset).limit(limit);
    },

    getCourse: async (_, { id }) => Course.findById(id),
  },

  Mutation: {
    signup: async (_, { email, password }) => {
      const user = new User({ email, password });
      await user.save();

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: "2h",
      });

      return { token, user };
    },

    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) throw new AuthenticationError("Invalid credentials");

      const valid = await user.isCorrectPassword(password);
      if (!valid) throw new AuthenticationError("Invalid credentials");

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: "1h",
      });

      return { token, user };
    },

    addStudent: async (_, args, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Student.create(args);
    },

    updateStudent: async (_, { id, input }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Student.findByIdAndUpdate(id, input, { new: true });
    },

    deleteStudent: async (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");

      await Course.updateMany({ students: id }, { $pull: { students: id } });
      await Student.findByIdAndDelete(id);
      return true;
    },

    addCourse: async (_, args, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Course.create(args);
    },

    updateCourse: async (_, { id, input }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Course.findByIdAndUpdate(id, input, { new: true });
    },

    deleteCourse: async (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");

      await Student.updateMany({ courses: id }, { $pull: { courses: id } });
      await Course.findByIdAndDelete(id);
      return true;
    },

    enrollStudent: async (_, { studentId, courseId }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");

      await Student.findByIdAndUpdate(studentId, {
        $addToSet: { courses: courseId },
      });

      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { students: studentId },
      });

      return Student.findById(studentId);
    },

    unenrollStudent: async (_, { studentId, courseId }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");

      await Student.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      });

      await Course.findByIdAndUpdate(courseId, {
        $pull: { students: studentId },
      });

      return Student.findById(studentId);
    },
  },
};

const startServer = async () => {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return {};

      try {
        const user = jwt.verify(token, JWT_SECRET);
        return { user };
      } catch {
        return {};
      }
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphQl" });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/graphQl`);
  });
};

startServer();
