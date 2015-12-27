module MessagesHelper
  def num_of_new_messages
    return 0 unless current_user

    Message.new_conversation(current_user).count
  end

  def num_of_unread_messages
    return 0 unless current_user

    Message.unread_conversation(current_user).count
  end

  def message_time(time)
    time_utc = time.utc
    current_time = Time.zone.now.utc

    if current_time.year == time_utc.year
      if current_time.beginning_of_day <= time_utc && time_utc <= current_time.end_of_day
        time.strftime("%I:%M%P")
      elsif current_time.beginning_of_week <= time_utc && time_utc <= current_time.end_of_week
        time.strftime("%a")
      else
        time.strftime("%b %d")
      end
    else
      time.strftime("%m/%d/%y")
    end
  end
end
