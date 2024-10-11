const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Task extends Model {}

Task.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'projects', // References the 'projects' table
            key: 'id',
        },
        onDelete: 'CASCADE', // Deletes tasks when the referenced project is deleted
    },
    cu_task_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    task_title: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    actual_start_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    actual_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    rate_card: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    plan_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
    },
    actual_cost: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
    },
    spi: {
        type: DataTypes.DECIMAL(4, 2), //test Schedule Performance Index
        allowNull: true,
    },
    cpi: {
        type: DataTypes.DECIMAL(4, 2), // Cost Performance Index
        allowNull: true,
    },
    status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,  // Default status to true (active)
      },
    created_at: {
        type: DataTypes.DATE, // Change here to DataTypes.DATE
        defaultValue: DataTypes.NOW,
    }
}, {
    sequelize,
    modelName: 'Task',
    tableName: 'tasks',
    timestamps: false, // Disable default timestamps
});

module.exports = Task;
