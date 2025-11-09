const { Schema, model, Types } = require("mongoose");

const studentSchema = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+@.+\..+/, "Must use a valid email address"],
  },
  age: { type: Number, required: true },
  major: { type: String },
  courses: [{ type: Types.ObjectId, ref: "Course", default: [] }],
});

module.exports = model("Student", studentSchema);
