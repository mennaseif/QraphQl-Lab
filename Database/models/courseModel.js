const { Schema, model, Types } = require("mongoose");

const courseSchema = new Schema({
  title: { type: String, required: true },
  code: { type: String, required: true },
  credits: { type: Number, required: true },
  instructor: { type: String, required: true },
  students: [{ type: Types.ObjectId, ref: "Student", default: [] }],
});

module.exports = model("Course", courseSchema);
