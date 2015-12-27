Rails.application.routes.draw do

  resources :users do
    collection do
      get :search_friends
    end
  end

  resources :messages do
    collection do
      get :received_messages
      get :load_a_conversation

      post :delete_conversation, defaults: {format: :json}
      post :mark_as_read_unread, defaults: {format: :json}
    end
  end
end
