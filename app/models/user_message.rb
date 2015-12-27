class UserMessage < ActiveRecord::Base
  # t.integer :user_id
  # t.integer :message_id
  # t.boolean :is_read, default: false
  # t.boolean :is_new, default: false
  # t.boolean :is_deleted, default: false
  # t.string :message_code

  belongs_to :user
  belongs_to :message

  validates_presence_of :user_id, :message_id, :message_code

  validates_uniqueness_of :user_id, scope: [:message_id]

  default_scope {where(is_deleted: false)}

  scope :last_msg_on_conversation_of_user, -> {where("user_messages.id IN (SELECT MAX(user_messages.id) FROM user_messages GROUP BY user_messages.message_code, user_messages.user_id)").order(created_at: :desc)}
end
