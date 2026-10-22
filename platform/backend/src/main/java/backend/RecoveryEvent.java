
package backend;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "recovery_events")
public class RecoveryEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String containerName;
    private String eventType;
    private String message;
    private LocalDateTime eventTime;

    public RecoveryEvent() {
    }

    public RecoveryEvent(
            String containerName,
            String eventType,
            String message,
            LocalDateTime eventTime) {
        this.containerName = containerName;
        this.eventType = eventType;
        this.message = message;
        this.eventTime = eventTime;
    }

    public Long getId() {
        return id;
    }

    public String getContainerName() {
        return containerName;
    }

    public String getEventType() {
        return eventType;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getEventTime() {
        return eventTime;
    }
}
