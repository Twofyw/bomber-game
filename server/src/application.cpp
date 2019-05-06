#include "../include/application.hpp"

using namespace fly;
using namespace std;
const string InitPassword = "123456";

extern PresentationLayer PreLayerInstance;
extern TransferLayer TransLayerInstance;

DatabaseConnection *DatabaseConnection::obj = NULL;
ApplicationLayer::ApplicationLayer()
{
        // initialize DatabaseConnection class
        DatabaseConnection::get_instance()->DatabaseInit();

        return;
}

bool ApplicationLayer::CheckUser(std::string user_name_)
{
        return DatabaseConnection::get_instance()->check_account(user_name_);
}

bool ApplicationLayer::CheckPasswd(std::string user_name_, std::string password_)
{
        return DatabaseConnection::get_instance()->check_password(user_name_, password_);
}

bool ApplicationLayer::ResetPasswd(std::string user_name_, std::string password_) 
{
        return DatabaseConnection::get_instance()->reset_password(user_name_, password_);
}

void ApplicationLayer::MessageToApp(Client *client_name_)
{
        // main process here
        // finite state machine
        Message_To_App *message_ = &client_name_->message_ptoa;
        Message_To_Pre *respond_ = &client_name_->message_atop;
        switch(client_name_->state)
        {
                case SessionState::Acceptance: {
                        if(message_->type_ != PacketType::Info){
                                // error occurs
                                // client_name_.message_atop.respond_ = ResponseType::ErrorOccurs;
                                respond_->respond_ = ResponseType::ErrorOccurs;
                                PreLayerInstance.pack_Message(client_name_);
                                LOG(Error) << "Error receive info packet: " << unsigned(uint8_t(message_->type_)) << endl 
                                    << "Username: " << message_->user_name_ << std::endl;
                                return;
                                // stop the connection 
                                // client_name_->state = SessionState::Error;
                                // respond_.type_ = PacketType::InfoResponse;
                        }        
                        // do recv info packet
                        switch(CheckUser(message_->user_name_)){
                               case true: {
                                       // account exists
                                        respond_->type_ = PacketType::InfoResponse;
                                        respond_->respond_ = ResponseType::OK;
                                        client_name_->state = SessionState::WaitForPasswd;
                                        client_name_->host_username_ = message_->user_name_;
                                        LOG(Info) << "Check User Exists" << std::endl;
                                        PreLayerInstance.pack_Message(client_name_);
                                       break;
                               }
                               case false: {
                                       // account not exists
                                        respond_->type_ = PacketType::InfoResponse;
                                        respond_->respond_ = ResponseType::UserNotExist;
                                        client_name_->state = SessionState::Error;
                                        LOG(Error) << "User not Exists" << std::endl;
                                        PreLayerInstance.pack_Message(client_name_);
                                        break;
                               }
                        }
                        break;
                }
                case SessionState::WaitForPasswd: {
                        if(message_->type_ != PacketType::Password) {
                                // error occurs
                                LOG(Error) << "Error receive password packet" << std::endl;
                                // stop the connection
                                client_name_->state = SessionState::Error;
                                respond_->type_ = PacketType::PasswordResponse;
                                respond_->respond_ = ResponseType::ErrorOccurs;
                                PreLayerInstance.pack_Message(client_name_);
                                return;
                        }
                        // do recv password packet
                        switch(CheckPasswd(client_name_->host_username_, message_->password_)) {
                                case true: {
                                        // password correct
                                        Client * client_temp;
                                        if((client_temp = TransLayerInstance.find_by_username_cnt(client_name_)) !=NULL) {
                                                client_temp->message_atop.type_ = PacketType::Refuse;
                                                client_temp->message_atop.respond_ = ResponseType::ErrorOccurs;
                                                PreLayerInstance.pack_Message(client_temp);
                                                respond_->type_ = PacketType::Refuse;
                                                respond_->respond_ = ResponseType::AlreadyLoggedIn;
                                                PreLayerInstance.pack_Message(client_name_);
                                        }
                                        if(message_->password_ == InitPassword) {
                                                // need to reset password
                                                LOG(Info) << "Need to reset password" << endl;
						// respond_->type_ = PacketType::PasswordResponse;
						// respond_->respond_ = ResponseType::OK;
						// PreLayerInstance.pack_Message(client_name_);
                                                client_name_->state = SessionState::WaitForNewPasswd;
                                                respond_->type_ = PacketType::PasswordResponse;
                                                respond_->respond_ = ResponseType::ChangePassword;
                                                PreLayerInstance.pack_Message(client_name_);
                                                break;
                                        }
                                        else {
                                                // do not need to reset
                                                respond_->type_ = PacketType::PasswordResponse;
                                                respond_->respond_ = ResponseType::OK;
                                                PreLayerInstance.pack_Message(client_name_);
                                                client_name_->state = SessionState::ServerWaiting;
                                                respond_->type_ = PacketType::Configuration;
                                                respond_->history_ = DatabaseConnection::get_instance()->retrive_message(client_name_->host_username_);
                                                respond_->config_ = DatabaseConnection::get_instance()->retrive_history_count(client_name_->host_username_);
                                                PreLayerInstance.pack_Message(client_name_);
                                                break;
                                        }
                                }
                                case false: {
                                        // password error
                                        LOG(Info) << "Recv Wrong Password" << endl;
                                        client_name_->state = SessionState::Error;
                                        respond_->type_ = PacketType::PasswordResponse;
                                        respond_->respond_ = ResponseType::WrongPassword;
                                        PreLayerInstance.pack_Message(client_name_);
                                        break;
                                }
                                break;
                        }
                        break;
                }
                case SessionState::WaitForNewPasswd :{
                        if(message_->type_ != PacketType::Password) {
                                // error occurs
                                LOG(Error) << "Error receive password packet" << std::endl;
                                // stop the connection
                                client_name_->state = SessionState::Error;
                                respond_->type_ = PacketType::PasswordResponse;
                                respond_->respond_ = ResponseType::ErrorOccurs;
                                PreLayerInstance.pack_Message(client_name_);
                        }
                        else {
                                LOG(Info) << "reset password succeed" << endl;
                                ResetPasswd(client_name_->host_username_, message_->password_);
                                respond_->type_ = PacketType::PasswordResponse;
                                respond_->respond_ = ResponseType::OK;
                                PreLayerInstance.pack_Message(client_name_);
                                client_name_->state = SessionState::ServerWaiting;
                                respond_->type_ = PacketType::Configuration;
                                respond_->history_ = DatabaseConnection::get_instance()->retrive_message(client_name_->host_username_);
                                respond_->config_ = DatabaseConnection::get_instance()->retrive_history_count(client_name_->host_username_);
                                PreLayerInstance.pack_Message(client_name_);
                                break;
                        }
                        break;
                }
                case SessionState::ServerWaiting: {
                        switch(message_->type_) {
                                case PacketType::TextUsername: {
                                        LOG(Info) << "Wait for text" << endl;
                                        client_name_->state = SessionState::WaitForText;
                                        // LOG(Debug) << message_->user_name_ << endl;
                                        // client = message_->user_name_;
                                        break;
                                }
                                case PacketType::FileUsername: {
                                        // still in progress
                                        LOG(Info) << "Wait for File" << endl;
                                }
                                case PacketType::GroupTextUserlist: {
                                        LOG(Info) << "Wait for text" << endl;
                                        client_name_->state = SessionState::WaitForText;
                                        break;
                                }
                        }
                        break;
                }
                case SessionState::WaitForText: {
                        if(message_->type_ != PacketType::Text) {
                                // error occurs
                                LOG(Error) << "Error receive password packet" << std::endl;
                                // stop the connection
                                client_name_->state = SessionState::Error;
                                respond_->type_ = PacketType::PasswordResponse;
                                respond_->respond_ = ResponseType::ErrorOccurs;
                                PreLayerInstance.pack_Message(client_name_);
                        }
                        else {
                                LOG(Info) << "recv text information" << endl;
                                client_name_->state = SessionState::ServerWaiting;
                                respond_->type_ = PacketType::Text;
                                // cout << message_->user_name_ << endl;
                                // cout << "debug" << endl;
                                // LOG(Debug) << message_->user_name_ << endl;
                                DatabaseConnection::get_instance()->push_message(client_name_->host_username_, message_->user_name_, message_->media_text_);
                                PreLayerInstance.pack_Message(client_name_);
                                break;
                        }
                        break;
                }
        }

        return ;
}
