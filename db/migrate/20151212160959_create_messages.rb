class CreateMessages < ActiveRecord::Migration
  def change
    create_table :messages do |t|
      t.integer :created_by_id
      t.integer :received_by_id
      t.text :message
      t.string :message_code

      t.timestamps
    end

    add_index :messages, :message_code
    add_index :messages, [:created_by_id, :received_by_id]
  end
end
