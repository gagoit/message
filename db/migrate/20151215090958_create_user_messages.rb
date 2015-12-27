class CreateUserMessages < ActiveRecord::Migration
  def change
    create_table :user_messages do |t|
      t.integer :user_id
      t.integer :message_id
      t.boolean :is_read, default: false
      t.boolean :is_new, default: false
      t.boolean :is_deleted, default: false
      t.string :message_code

      t.timestamps
    end

    add_index :user_messages, [:user_id, :is_new]
    add_index :user_messages, [:user_id, :is_read]
    add_index :user_messages, [:user_id, :message_id, :message_code]
  end
end
