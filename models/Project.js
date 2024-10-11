const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Project extends Model {}

Project.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    project_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    cu_project_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    modified_by: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,  // Default status to true (active)
      },
}, {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: false, // Disable default timestamps
});

module.exports = Project;
